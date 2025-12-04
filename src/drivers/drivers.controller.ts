import { Body, Controller, Get, Param, ParseIntPipe, Patch, Put, Post } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('login')
  login(@Body() dto: LoginDriverDto) {
    return this.driversService.login(dto);
  }

  @Put(':id/location')
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(id, dto);
  }

  @Get(':id/delivery')
  getActiveDelivery(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getActiveDelivery(id);
  }

  @Patch(':driverId/delivery/:deliveryId/status')
  updateDeliveryStatus(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('deliveryId', ParseIntPipe) deliveryId: number,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.driversService.updateDeliveryStatus(driverId, deliveryId, dto);
  }
}
