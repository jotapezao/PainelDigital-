const fs = require('fs');

const content = fs.readFileSync('frontend/src/pages/PlaylistEditor.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
const tagRegex = /<(div|span|button|section|header|footer|aside|main|nav|React\.Fragment)(?:\s+[^>]*?)?(?<!\/)>|<\/(div|span|button|section|header|footer|aside|main|nav|React\.Fragment)>/g;

lines.forEach((line, index) => {
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const fullTag = match[0];
    const tagName = match[1] || match[2];
    const isClosing = fullTag.startsWith('</');

    if (isClosing) {
      if (stack.length === 0) {
        console.log(`Error: Extra closing tag </${tagName}> at line ${index + 1}`);
      } else {
        const last = stack.pop();
        if (last.name !== tagName) {
          console.log(`Error: Mismatched tag. Expected </${last.name}> but found </${tagName}> at line ${index + 1} (opened at line ${last.line})`);
        }
      }
    } else {
      stack.push({ name: tagName, line: index + 1 });
    }
  }
});

if (stack.length > 0) {
  console.log(`Error: Unclosed tags at end of file:`);
  stack.forEach(tag => console.log(`  <${tag.name}> opened at line ${tag.line}`));
} else {
  console.log('No unclosed tags found (for tracked tags).');
}
