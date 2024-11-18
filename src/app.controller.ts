import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller({ path: 'bl4c', version: '1' }) 
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post("/result")
  @UseInterceptors(FileInterceptor('file'))
  handleExcelUpload(@UploadedFile() file: Express.Multer.File): void {
    console.log(file.originalname); // File name
    console.log(file.mimetype); // MIME type
    console.log(file.buffer); // File buffer (binary data)

    this.appService.doWork(file);
    
  }
}
