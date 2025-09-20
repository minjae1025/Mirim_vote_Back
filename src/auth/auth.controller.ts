import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('getUser')
  async getUser(@Body() body: any): Promise<any> {
    return await this.authService.getUser(body);
  }

  @Post('google')
  async authGoogle(@Body() body: any): Promise<any> {
    return await this.authService.authLogin(body);
  }

}