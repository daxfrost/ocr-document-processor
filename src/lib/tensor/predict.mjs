import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Runs the Python prediction script with the provided image path.
 * @param imagePath - Absolute or relative path to the image to predict.
 */
export async function predict(imagePath) {
  // Adjust the path to your Python prediction script.
  // The Python script should import your model and call predict_image.

  const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
  const __dirname = path.dirname(__filename); // get the name of the directory

  const pythonScriptPath = path.join(__dirname, 'predict.py');

  console.log(pythonScriptPath);

  // Spawn a Python process. The first argument is the script and the second is the image path.
  const pythonProcess = spawn('python3', [pythonScriptPath, imagePath]);

  return new Promise((resolve, reject) => {
    let outputData = '';

    // Capture the output (stdout) from Python.
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Capture any errors (stderr) from Python.
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    // Resolve the promise with the output data when the process finishes.
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(outputData);
      } else {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });
  });
}

// Example usage: replace 'test_image.jpg' with your image file path.
// const testImagePath = '/Users/daxbooysen/dev/daxfrost/freight-ocr-demo/tensorflow/testing/dataset/validation/untrained/INVOICE/invoice-example-untrained-1.jpg';
// runPythonPrediction(testImagePath);
