const isoDateStr = new Date().toISOString();
const iterations = 1000000;

console.log(`Benchmarking date parsing for ${iterations} iterations...`);

console.time('new Date(str).getTime()');
for (let i = 0; i < iterations; i++) {
  new Date(isoDateStr).getTime();
}
console.timeEnd('new Date(str).getTime()');

console.time('Date.parse(str)');
for (let i = 0; i < iterations; i++) {
  Date.parse(isoDateStr);
}
console.timeEnd('Date.parse(str)');
