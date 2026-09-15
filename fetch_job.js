fetch('https://sw.orbitdatasync3.homes/job/mtaalamu-wa-uajiri-chui-security-services-morogoro-18197')
  .then(r => r.text())
  .then(t => {
    console.log(t);
  });
