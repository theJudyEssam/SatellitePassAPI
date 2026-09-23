import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SatelliteService } from './satallite.service';

describe('SatelliteService', () => {
  let service: SatelliteService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatelliteService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SatelliteService>(SatelliteService);
    httpService = module.get<HttpService>(HttpService);
  });

  // tests for the SatelliteService methods


  // sanity check
  describe('service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });


  // tests for the getSatellite method
  describe('getSatellite', () => {
    it('should fetch and parse TLE data', async () => {
      // ARRANGE
      const mockTle = `ISS (ZARYA)
        1 25544U 98067A   26266.17434351  .00015334  00000+0  27316-3 0  9994
        2 25544  51.6318  24.6342 0004737  44.1838  66.0055 15.49240021469478`;

      (httpService.get as jest.Mock).mockReturnValue(
        of({
          data: mockTle,
        }),
      );

      // ACT
      const result = await service.getSatellite(25544);

      // ASSERT
      expect(result).toEqual({
        name: 'ISS (ZARYA)',
        tleLine1:
          '1 25544U 98067A   26266.17434351  .00015334  00000+0  27316-3 0  9994',
        tleLine2:
          '2 25544  51.6318  24.6342 0004737  44.1838  66.0055 15.49240021469478',
      });

      expect(httpService.get).toHaveBeenCalled();
    });

    it('should throw an error when CelesTrak returns invalid data', async () => {
      // ARRANGE
      (httpService.get as jest.Mock).mockReturnValue(
        of({
          data: 'Invalid response',
        }),
      );

      // ACT + ASSERT
      await expect(service.getSatellite(25544)).rejects.toThrow();
    });

    it('should throw an error when the HTTP request fails', async () => {
      // ARRANGE
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('CelesTrak unavailable')),
      );

      // ACT + ASSERT
      await expect(service.getSatellite(25544)).rejects.toThrow();
    });
  });

  describe('getLookAngles', () => {
    it('should calculate valid look angles', async () => {
      // ARRANGE
      const tleLine1 =
        '1 25544U 98067A   26266.17434351  .00015334  00000+0  27316-3 0  9994';

      const tleLine2 =
        '2 25544  51.6318  24.6342 0004737  44.1838  66.0055 15.49240021469478';

      const observer = {
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 10,
      };

      const date = new Date('2026-09-23T12:00:00Z');

      // ACT
      const result = service.getLookAngles(tleLine1, tleLine2, observer, date);

      // ASSERT
      expect(result).toBeDefined();

      expect(result.azimuth).toBeGreaterThanOrEqual(0);
      expect(result.azimuth).toBeLessThanOrEqual(360);

      expect(result.elevation).toBeGreaterThanOrEqual(-90);
      expect(result.elevation).toBeLessThanOrEqual(90);

      expect(result.rangeKm).toBeGreaterThan(0);
    });
  });

  describe('calculatePassTime', () => {
    it('should detect a satellite pass', async () => {
      // ARRANGE
      const elevations = [-27, -19, -8, 4, 17, 31, 44, 51, 43, 28, 13, 5];

      jest.spyOn(service, 'getSatellite').mockResolvedValue({
        name: 'ISS (ZARYA)',
        tleLine1: 'fake-tle-line-1',
        tleLine2: 'fake-tle-line-2',
      });

      let callNumber = 0;

      jest.spyOn(service, 'getLookAngles').mockImplementation(() => {
        const elevation = elevations[callNumber] ?? 5;
        callNumber++;

        return {
          azimuth: 0,
          elevation,
          rangeKm: 1000,
        };
      });

      const observer = {
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 10,
      };

      // ACT
      const result = await service.calculatePassTime(observer, 25544);

      // ASSERT
      expect(result.riseTime).not.toBeNull();
      expect(result.peakTime).not.toBeNull();
      expect(result.setTime).not.toBeNull();

      expect(result.maxElevation).toBe(51);
    });

    it('should return no pass when the satellite stays below the minimum elevation', async () => {
      // ARRANGE
      jest.spyOn(service, 'getSatellite').mockResolvedValue({
        name: 'ISS (ZARYA)',
        tleLine1: 'fake-tle-line-1',
        tleLine2: 'fake-tle-line-2',
      });

      jest.spyOn(service, 'getLookAngles').mockReturnValue({
        azimuth: 0,
        elevation: 5,
        rangeKm: 1000,
      });

      const observer = {
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 10,
      };

      // ACT
      const result = await service.calculatePassTime(observer, 25544);

      // ASSERT
      expect(result.riseTime).toBeNull();
      expect(result.peakTime).toBeNull();
      expect(result.setTime).toBeNull();
      expect(result.maxElevation).toBe(-90);
    });
  });
});
