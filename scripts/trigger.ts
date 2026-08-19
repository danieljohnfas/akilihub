const trigger = async () => {
  const res = await fetch("https://www.akilibrain.com/api/admin/start-cleanup?secret=start-cleaning-now");
  const data = await res.json();
  console.log(data);
};

trigger();
