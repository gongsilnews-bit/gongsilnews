fetch('https://gongsilnews.com/news/75')
  .then(r => r.text())
  .then(t => {
    const matches = t.match(/[a-f0-9]{32}/g);
    if (matches) {
      console.log("Found 32-char hex strings in production HTML:");
      console.log([...new Set(matches)]);
    } else {
      console.log("No 32-char hex strings found.");
    }
  })
  .catch(console.error);
