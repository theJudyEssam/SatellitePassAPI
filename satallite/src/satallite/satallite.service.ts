import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as satellite from 'satellite.js';
import { SatelliteTLE } from './satallite.interface';
import { Observer } from './observer.interface';

const MIN_ELEVATION = 10;
const STEP_MS = 60 * 1000;

@Injectable()
export class SatelliteService {
  private readonly CELESTRAK_URL =
    'https://celestrak.org/NORAD/elements/gp.php';

  constructor(private readonly httpService: HttpService) {}

  async getSatellite(noradId: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(this.CELESTRAK_URL, {
          params: {
            CATNR: noradId,
            FORMAT: 'TLE',
          },
          responseType: 'text',
        }),
      );

      const lines = response.data.trim().split('\n');

      if (lines.length < 3) {
        throw new Error('Invalid TLE data returned from CelesTrak');
      }

      const name = lines[0].trim();
      const tleLine1 = lines[1].trim();
      const tleLine2 = lines[2].trim();
      const SatelliteTLE: SatelliteTLE = {
        name,
        tleLine1,
        tleLine2,
      };

      return SatelliteTLE;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch satellite data from CelesTrak: ${error}`,
      );
    }
  }

  propagateSatellite(
    tleLine1: string,
    tleLine2: string,
    date: Date = new Date(),
  ) {
    try {
      // 1. Initialize a satellite record from TLE strings
      const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

      // 2. Propagate to the designated time
      const positionAndVelocity = satellite.propagate(satrec, date);

      const positionEci = positionAndVelocity.position;
      if (!positionEci || typeof positionEci === 'boolean') {
        throw new BadRequestException(
          'Propagation failed: Satellite may have decayed.',
        );
      }

      // 3. Convert ECI coordinates to Geodetic (Lat/Lng) coordinates
      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);

      // 4. Transform radians to readable degrees and kilometers
      const longitude = satellite.radiansToDegrees(positionGd.longitude);
      const latitude = satellite.radiansToDegrees(positionGd.latitude);
      const altitudeKm = positionGd.height; // Already in kilometers

      const positionEcf = satellite.eciToEcf(positionEci, gmst);

      return {
        timestamp: date.toISOString(),

        eci: {
          x: positionEci.x,
          y: positionEci.y,
          z: positionEci.z,
        },

        ecf: {
          x: positionEcf.x,
          y: positionEcf.y,
          z: positionEcf.z,
        },

        geodetic: {
          latitude,
          longitude,
          altitudeKm,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error || 'Error processing satellite propagation',
      );
    }
  }

  getLookAngles(
    tleLine1: string,
    tleLine2: string,
    observer: Observer,
    date: Date = new Date(),
  ) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    const positionAndVelocity = satellite.propagate(satrec, date);

    const positionEci = positionAndVelocity.position;

    if (!positionEci || typeof positionEci === 'boolean') {
      throw new BadRequestException(
        'Propagation failed: Satellite may have decayed.',
      );
    }

    const gmst = satellite.gstime(date);

    const positionEcf = satellite.eciToEcf(positionEci, gmst);

    const observerGd = {
      latitude: satellite.degreesToRadians(observer.latitude),
      longitude: satellite.degreesToRadians(observer.longitude),
      height: observer.altitude / 1000,
    };

    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    return {
      azimuth: satellite.radiansToDegrees(lookAngles.azimuth),
      elevation: satellite.radiansToDegrees(lookAngles.elevation),
      rangeKm: lookAngles.rangeSat,
    };
  }

  async calculatePassTime(observer: Observer, noradId: number) {
    const satelliteTle = await this.getSatellite(noradId);

    const now = new Date();

    const previousTime = now;
    let previousElevation = this.getLookAngles(
      satelliteTle.tleLine1,
      satelliteTle.tleLine2,
      observer,
      previousTime,
    ).elevation;

    let riseTime: Date | null = null;
    let setTime: Date | null = null;

    let maxElevation = -90;
    let peakTime: Date | null = null;

    for (let i = 1; i <= 1440; i++) {
      const currentTime = new Date(now.getTime() + i * STEP_MS);

      const currentElevation = this.getLookAngles(
        satelliteTle.tleLine1,
        satelliteTle.tleLine2,
        observer,
        currentTime,
      ).elevation;

      // Satellite crossed ABOVE our 10° threshold
      if (
        previousElevation < MIN_ELEVATION &&
        currentElevation >= MIN_ELEVATION
      ) {
        riseTime = currentTime;
      }

      // Satellite is currently inside the pass
      if (riseTime !== null && currentElevation > maxElevation) {
        maxElevation = currentElevation;
        peakTime = currentTime;
      }

      // Satellite crossed BELOW our 10° threshold
      if (
        riseTime !== null &&
        previousElevation >= MIN_ELEVATION &&
        currentElevation < MIN_ELEVATION
      ) {
        setTime = currentTime;
        break;
      }

      previousElevation = currentElevation;
    }

    return {
      riseTime,
      peakTime,
      setTime,
      maxElevation,
    };
  }
}
