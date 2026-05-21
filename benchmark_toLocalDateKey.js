const { performance } = require('perf_hooks');

const parseDate = (date) => {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  return new Date(date);
};

const toLocalDateKeyOriginal = (date) => {
  const d = parseDate(date);
  // Example of how it might be done currently
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
};

const dates = [];
for (let i = 0; i < 10000; i++) {
  dates.push(new Date(Date.now() - Math.random() * 10000000000));
}

let start = performance.now();
for (let i = 0; i < 10000; i++) {
  toLocalDateKeyOriginal(dates[i]);
}
let end = performance.now();
console.log(`Original: ${end - start} ms`);
