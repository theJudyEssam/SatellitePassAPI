import { Module } from '@nestjs/common';
import { SatelliteModule } from './satallite/satallite.module';

@Module({
  imports: [SatelliteModule],
})
export class AppModule {}
