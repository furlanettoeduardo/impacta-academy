import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly defaultAdminEmail = 'admin@academy.com';
  private readonly defaultAdminPassword = 'Master123';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  private async ensureDefaultAdmin() {
    const existing = await this.prisma.user.findUnique({
      where: { email: this.defaultAdminEmail },
    });

    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(this.defaultAdminPassword, 10);

    await this.prisma.user.create({
      data: {
        name: 'Admin',
        email: this.defaultAdminEmail,
        password: passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  async create(data: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async update(id: string, data: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (data.email && data.email !== existing.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailInUse) {
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      isActive?: boolean;
    } = {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const coursesCount = await this.prisma.course.count({
      where: { createdBy: id },
    });
    if (coursesCount > 0) {
      throw new ConflictException('User has courses and cannot be deleted');
    }

    const user = await this.prisma.user.delete({ where: { id } });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
