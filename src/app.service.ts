import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { execSync } from 'child_process'; // Synchronous execution for simplicity
import OpenAI from 'openai';
import * as os from 'os';
import { skip } from 'node:test';



@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async doWork(file: Express.Multer.File, model: string, newFileName: string) : Promise<void> {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    let total : number = 0;

    for (const [index, row] of data.entries()) {

      //ToDo: remove the following after excel is fixed
      
      if (index < 51 || index > 105)
      {
        continue;
      }

      const promptValue = row['prompt'];
      
      let code: string = "";
      let result: string = "";


        if (promptValue) {
          code = await this.sendToGpt(promptValue, model);      
        }
  
        const testValue = row['test'];
        if (testValue) {
          result = this.sendToRustCompiler(code + testValue);
        }
      

      if (result === "ok")
      {
        data[index][model] = 1 
        total += 1

      }
      else
      {
        data[index][model] = 0
      }
    }

    // Convert updated data back to a sheet
    let updatedSheet = xlsx.utils.json_to_sheet(data);

    
    xlsx.utils.sheet_add_aoa(updatedSheet, [["Total Correct", total]], { origin: "E166" });
    xlsx.utils.sheet_add_aoa(updatedSheet, [["Percentage Correct", (total / 164) * 100]], { origin: "E167" });

   
    // Replace the original sheet with the updated one
    workbook.Sheets[sheetName] = updatedSheet;


    
    fs.writeFileSync(newFileName+ ".xlsx", xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }));
    
    

  }

  async sendToGpt(text: string, model: string) : Promise<string> {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: model,
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
    
    const cleanedCode = code.replace(/```(rust)?/g, "").trim();

    /*
    // Regular expression to match from "fn" to the last three backticks
    const regex = /fn[\s\S]*?(?=\`\`\`)/;

    // Extract the match
    const result = code.match(regex);
    */
    return cleanedCode;
    
  }

  sendToRustCompiler(text: string) : string {
    return this.runRustCodeOnDocker(text)
    
  
  }

  runRustCodeOnDocker(text: string) : string{

    // Create a unique temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-temp-"));
    const rustFilePath = path.join(tempDir, "main.rs");

    let outputStatus : string = "";

    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    fs.writeFileSync(rustFilePath, text);

    const dockerCommandMain = `docker run --rm -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "rustc main.rs && ./main"`;

    const dockerCommand = `docker run --rm -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "cargo init --bin . && rustc --test main.rs && ./main"`
    let match : RegExpMatchArray;
    try {
      const output = execSync(dockerCommand, { encoding: 'utf-8' });
      // Regular expression to match only 'ok' or 'FAILED' in the test result
      match = output.match(/test result: (ok|FAILED)/);

      
 
    } catch (error) {
      // Handle errors (compilation/runtime) and return them
      return `Error: ${error.stderr || error.message}`;
    } finally {
      // Clean up temporary files
      if (fs.existsSync(rustFilePath)) {
        fs.unlinkSync(rustFilePath);
      }
    }
    return match ? match[1] : undefined;

}


}
