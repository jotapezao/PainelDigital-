const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/PlaylistEditor.jsx', 'utf8');

let stack = [];
for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{' || char === '(' || char === '[') {
    stack.push({ char, pos: i });
  } else if (char === '}' || char === ')' || char === ']') {
    if (stack.length === 0) {
      console.log(`Extra closing ${char} near position ${i}`);
    } else {
      const last = stack.pop();
      if ((char === '}' && last.char !== '{') ||
          (char === ')' && last.char !== '(') ||
          (char === ']' && last.char !== '[')) {
        console.log(`Mismatch: ${last.char} opened at ${last.pos}, closed by ${char} at ${i}`);
      }
    }
  }
}

if (stack.length > 0) {
  console.log('Unclosed:');
  stack.forEach(s => {
    const line = content.substring(0, s.pos).split('\n').length;
    console.log(`  ${s.char} at line ${line}`);
  });
} else {
  console.log('Balanced.');
}
