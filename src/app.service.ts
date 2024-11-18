import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { execSync } from 'child_process'; // Synchronous execution for simplicity



@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  doWork(file: Express.Multer.File) : void {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    data.forEach((row, index) =>{
      const promptValue = row['prompt'];
      if (promptValue) {
        //this.sendToGpt(promptValue);
      }

      const testValue = row['test'];
      if (testValue) {

      }
    })
    this.sendToGpt("fn has_close_elements(numbers: &[f64], threshold: f64) -> bool {\n\
    for i in 0..numbers.len() {\n\
        for j in (i + 1)..numbers.len() {\n\
            if (numbers[i] - numbers[j]).abs() < threshold {\n\
                return true;\n\
            }\n\
        }\n\
    }\n\
    false\n\
}\n\n\
#[cfg(test)]\n\
mod tests {\n\
    use super::*;\n\n\
    #[test]\n\
    fn test_has_close_elements() {\n\
        assert_eq!(has_close_elements(&vec![1.0, 2.0, 3.9, 4.0, 5.0, 2.2], 0.3), true);\n\
        assert_eq!(has_close_elements(&vec![1.0, 2.0, 3.9, 4.0, 5.0, 2.2], 0.05), false);\n\
        assert_eq!(has_close_elements(&vec![1.0, 2.0, 5.9, 4.0, 5.0], 0.95), true);\n\
        assert_eq!(has_close_elements(&vec![1.0, 2.0, 5.9, 4.0, 5.0], 0.8), false);\n\
        assert_eq!(has_close_elements(&vec![1.0, 2.0, 3.0, 4.0, 5.0, 2.0], 0.1), true);\n\
        assert_eq!(has_close_elements(&vec![1.1, 2.2, 3.1, 4.1, 5.1], 1.0), true);\n\
        assert_eq!(has_close_elements(&vec![1.1, 2.2, 3.1, 4.1, 5.1], 0.5), false);\n\
    }\n\
}"
)
  }

  sendToGpt(text: string) : string {
    this.sendToRustCompiler(text)
    return "";
  }

  sendToRustCompiler(text: string) : string {
    this.runRustCodeOnDocker(text)
    return ""
  
  }

  runRustCodeOnDocker(text: string) : string{
    const tempDir = path.join(__dirname, 'temp');
    const rustFilePath = path.join(tempDir, 'main.rs');

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

      if (match[1] === "ok") {
          console.log(1); // Output: 'ok' (or 'FAILED')
      } else {
          console.log(0);
      }
 
    } catch (error) {
      // Step 5: Handle errors (compilation/runtime) and return them
      return `Error: ${error.stderr || error.message}`;
    } finally {
      // Step 6: Clean up temporary files
      if (fs.existsSync(rustFilePath)) {
        fs.unlinkSync(rustFilePath);
      }

    return ""
  }
}


}
