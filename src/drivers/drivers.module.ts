import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
