const { format } = require('date-fns');

const iterations = 10000;
const date = new Date();
const timestamp = date.getTime();

console.time('toLocaleDateString');
for (let i = 0; i < iterations; i++) {
    new Date(timestamp).toLocaleDateString();
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
console.timeEnd('toLocaleDateString');

console.time('date-fns format');
for (let i = 0; i < iterations; i++) {
    format(timestamp, 'MMM d, yyyy');
    format(timestamp, 'h:mm a');
}
console.timeEnd('date-fns format');
