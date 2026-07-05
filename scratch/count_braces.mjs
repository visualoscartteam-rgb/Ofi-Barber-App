import fs from 'fs';

const content = fs.readFileSync('d:/MARCAS/TRABAJOS UNICOS/CARLOS BARBERO/APP CARLOS BARBERO/src/BarberDashboard.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
let stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      openBraces++;
      stack.push({ line: i + 1, char: j + 1 });
    } else if (char === '}') {
      openBraces--;
      if (stack.length > 0) {
        stack.pop();
      } else {
        console.log(`Extra closing brace at line ${i + 1}, char ${j + 1}`);
      }
    }
  }
}

console.log(`Final open braces count: ${openBraces}`);
if (stack.length > 0) {
  console.log("Unclosed opening braces at:");
  stack.forEach(pos => {
    console.log(`  Line ${pos.line}, Char ${pos.char}: ${lines[pos.line - 1].trim().substring(0, 40)}`);
  });
}
