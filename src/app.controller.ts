import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
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
  handleExcelUpload(@UploadedFile() file: Express.Multer.File, @Body() body: {model: string; newFileName: string; newSheetName: string}): void {
    
    const { model, newFileName, newSheetName } = body; 

    this.appService.doWork(file, model, newFileName, newSheetName);
    
  }
}
