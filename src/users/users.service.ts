import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return user;
  }

  async findOneForTelegramId(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    
    return user;
  }

  create(data: CreateUserDto) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: number, data: UpdateUserDto) {
    await this.findOne(id); // valida que exista

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // borrado lógico
    return this.prisma.user.delete({
        where: { id },
    });
  }
}