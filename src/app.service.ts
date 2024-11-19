import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { execSync } from 'child_process'; // Synchronous execution for simplicity
import OpenAI from 'openai';


@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async doWork(file: Express.Multer.File) : Promise<void> {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    let total : number = 0;

    for (const [index, row] of data.entries()) {

      //ToDo: remove the following after excel is fixed
      
      if (index >= 1)
      {
        break;
      }

      const promptValue = row['prompt'];
      
      let code: string = "";
      let result: string = "";


        if (promptValue) {
          code = await this.sendToGpt(promptValue);      
        }
  
        const testValue = row['test'];
        if (testValue) {
          result = this.sendToRustCompiler(code + testValue);
        }
      

      if (result === "ok")
      {
        data[index]["gpt-3.5-turbo"] = 1 
        total += 1

      }
      else
      {
        data[index]["gpt-3.5-turbo"] = 0
      }
    }

    // Convert updated data back to a sheet
    const updatedSheet = xlsx.utils.json_to_sheet(data);

    // Replace the original sheet with the updated one
    workbook.Sheets[sheetName] = updatedSheet;

    
    fs.writeFileSync("fil.xlsx", xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }));
    
    

  }

  async sendToGpt(text: string) : Promise<string> {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a programming assistant. Respond only with Rust function implementations, no comments or explanations."
        },
        {
          role: "user",
          content: text
        },
      ],
    });

    
    const code = completion.choices[0].message.content
    
    // Regular expression to match from "fn" to the last three backticks
    const regex = /fn[\s\S]*?(?=\`\`\`)/;

    // Extract the match
    const result = code.match(regex);

    return code;
    
  }

  sendToRustCompiler(text: string) : string {
    return this.runRustCodeOnDocker(text)
    
  
  }

  runRustCodeOnDocker(text: string) : string{
    const tempDir = path.join(__dirname, 'temp');
    const rustFilePath = path.join(tempDir, 'main.rs');
    let outputStatus : string = "";

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    fs.writeFileSync(rustFilePath, text);

    const dockerCommandMain = `docker run --rm -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "rustc main.rs && ./main"`;

    const dockerCommand = `docker run --rm -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "cargo init --bin . && rustc --test main.rs && ./main"`
    
    try {
      const output = execSync(dockerCommand, { encoding: 'utf-8' });
      // Regular expression to match only 'ok' or 'FAILED' in the test result
      const match = output.match(/test result: (ok|FAILED)/);

      return match ? match[1] : undefined;

 
    } catch (error) {
      // Step 5: Handle errors (compilation/runtime) and return them
      return `Error: ${error.stderr || error.message}`;
    } finally {
      // Step 6: Clean up temporary files
      if (fs.existsSync(rustFilePath)) {
        fs.unlinkSync(rustFilePath);
      }

    
  }
}


}
