
process.stdin.on('keypress', function (chunk, key) {
  console.log('Get Chunk: ' + chunk + '\n');
  if (key && key.ctrl && key.name == 'c') process.exit();
});