import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SatelliteService } from './satallite.service';
import { SatelliteController } from './satallite.controller';

@Module({
  imports: [HttpModule],
  controllers: [SatelliteController],
  providers: [SatelliteService],
})
export class SatelliteModule {}
