import fetch from "node-fetch";

async function run() {
  const res = await fetch("https://searx.space/data/instances.json");
  const data = await res.json();
  const instances = Object.keys(data.instances).filter(k => {
    const inst = data.instances[k];
    return inst.network_type === "normal" && inst.error === null && inst.timing?.search?.all?.median < 1.5;
  });
  console.log("Found working instances:", instances.length);
  console.log(instances.slice(0, 10));
}
run();
