const entries = $('article, .entry-content, .post-content').find('h2, h3, strong, b').each((i, el) => {
  const text = $(el).text().trim();
  const nextEl = $(el).next();
  
  if (text && text.length < 200 && !text.toLowerCase().includes('about') && !text.toLowerCase().includes('contact')) {
    let description = '';
    let sourceUrl = '';
    
    let current = nextEl;
    while (current.length && current[0].name !== 'h2' && current[0].name !== 'h3') {
      const content = $(current).text().trim();
      if (content) description += ' ' + content;
      
      const link = $(current).find('a').attr('href');
      if (link && link.includes('http')) {
        sourceUrl = link;
      }
      current = $(current).next();
    }

    if (description.length > 10 || sourceUrl) {
      result.push({
        title: text,
        companyName: 'United Nations',
        description: description.trim(),
        sourceUrl: sourceUrl,
        location: 'Tanzania'
      });
    }
  }
});