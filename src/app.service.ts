import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { execSync } from 'child_process'; // Synchronous execution for simplicity
import OpenAI from 'openai';
import * as os from 'os';



@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async doWork(file: Express.Multer.File, model: string, newFileName: string, newSheetName: string) : Promise<void> {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    const sheetName = newSheetName;
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    let total : number = 0;

    for (const [index, row] of data.entries()) {

      //ToDo: remove the following after excel is fixed
      

      /*
      if (index == 39 || index == 96 || index == 120 || index == 133)
      {
        continue;
      }
        */
      

      
      /*
    const allowedIndices = [
        0, 5, 10, 12, 19, 32, 33, 65, 74, 83, 85, 91, 93, 94, 98, 102, 103, 
    104, 108, 114, 115, 116, 117, 122, 125, 126, 129, 130, 132, 134, 
    137, 140, 141, 144, 145, 147, 154, 158, 162, 163
    ]
    */
    const allowedIndices = [
      /*
      12, 32, 33, 39, 65, 74, 83, 85, 91, 96, 98, 102, 103, 104, 
      108, 115, 116, 120, 125, 130, 132, 133, 134, 137, 140, 145, 147, 163
      */
      //74, 83, 115, 132, 103, 108, 125, 133

      //1, 6, 9, 10, 12, 14, 18, 26, 32, 33, 36, 37, 38, 41, 45, 49, 54, 64, 65, 67, 69, 70, 71, 73, 74, 76, 83, 84, 85, 86, 91, 93, 98, 100, 103, 108, 109, 110, 113, 115, 116, 117, 118, 119, 125, 127, 128, 129, 130, 131, 132, 134, 135, 137, 138, 140, 145, 147, 148, 150, 151, 153, 154, 158, 160, 161, 162, 163
      //39, 96, 120, 133
      39 
    ]
    if (!allowedIndices.includes(index)) {
      continue; // Skip the iteration if index is not in the list
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
      

        data[index]["Code & Test"] = code + testValue;
        data[index]["output"] = result; 
        
        const match = result.match(/test result: (ok|FAILED)/);
        const isOk = match ? match[1] : undefined;
    
        
      if (isOk === "ok")
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

    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames.push(sheetName);
    }
    
    
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
          content: "You are a programming assistant. Respond only with Rust function implementations, no comments or explanations. You may include the necessary imports"
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

    //const dockerCommand = `docker run --rm -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "cargo init --bin . && (grep -qxF '[dependencies]' Cargo.toml || echo '[dependencies]' >> Cargo.toml) && sed -i '/\\[dependencies\\]/a rand = \\"0.8\\"' Cargo.toml && cargo test -- --nocapture"`;


    const dockerCommand = `docker run --rm -v ~/.cargo:/root/.cargo -v ~/.cargo_target:/usr/src/myapp/target -v ${tempDir}:/usr/src/myapp -w /usr/src/myapp rust:latest bash -c "export PATH=$PATH:/root/.cargo/bin && cargo init --bin . && (grep -qxF '[dependencies]' Cargo.toml || echo '[dependencies]' >> Cargo.toml) && sed -i '/\\[dependencies\\]/a rand = \\"0.8\\"\\nchrono = \\"0.4\\"\\nregex = \\"1.7.0\\"\\nnum = \\"0.4\\"\\nmd5 = \\"0.7\\"' Cargo.toml && cargo test -- --nocapture"`;


    let output : string = "";

    let match : RegExpMatchArray;
    try {
      output = execSync(dockerCommand, { encoding: 'utf-8' });
      // Regular expression to match only 'ok' or 'FAILED' in the test result
      
      
 
    } catch (error) {
      // Handle errors (compilation/runtime) and return them
      return `Error: ${error.stderr || error.message}`;
    } finally {
      // Clean up temporary files
      if (fs.existsSync(rustFilePath)) {
        fs.unlinkSync(rustFilePath);
      }
    }
    return output;

}


}
