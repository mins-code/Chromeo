const { format } = require('date-fns');

const date = new Date();

function formatKey(d) {
  return format(d, 'yyyy-MM-dd');
}

function nativeLocalDateKey(d) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
}

function nativeUtcDateKey(d) {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
}

function isoDateKey(d) {
  return d.toISOString().split('T')[0];
}

console.time('date-fns format');
for (let i = 0; i < 100000; i++) formatKey(date);
console.timeEnd('date-fns format');

console.time('native local');
for (let i = 0; i < 100000; i++) nativeLocalDateKey(date);
console.timeEnd('native local');

console.time('toISOString split');
for (let i = 0; i < 100000; i++) isoDateKey(date);
console.timeEnd('toISOString split');

console.time('native UTC');
for (let i = 0; i < 100000; i++) nativeUtcDateKey(date);
console.timeEnd('native UTC');
