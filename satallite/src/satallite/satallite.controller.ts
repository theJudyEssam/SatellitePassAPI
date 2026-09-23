import {
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { SatelliteService } from './satallite.service';

@Controller('satellites')
export class SatelliteController {
  constructor(private readonly satelliteService: SatelliteService) {}

  @Get(':noradId')
  getSatellite(@Param('noradId', ParseIntPipe) noradId: number) {
    return this.satelliteService.getSatellite(noradId);
  }

  @Get(':noradId/propagate')
  propagateSatellite(@Param('noradId', ParseIntPipe) noradId: number) {
    return this.satelliteService.getSatellite(noradId).then((satellite) => {
      const { tleLine1, tleLine2 } = satellite;
      return this.satelliteService.propagateSatellite(tleLine1, tleLine2);
    });
  }

  @Get(':noradId/pass-time/:latitude/:longitude/:altitude')
  calculatePassTime(
    @Param('noradId', ParseIntPipe) noradId: number,
    @Param('latitude', ParseFloatPipe) latitude: number,
    @Param('longitude', ParseFloatPipe) longitude: number,
    @Param('altitude', ParseFloatPipe) altitude: number,
  ) {
    const observer = {
      latitude,
      longitude,
      altitude,
    };

    return this.satelliteService.calculatePassTime(observer, noradId);
  }
}
