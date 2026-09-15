function tokenOverlap(a, b) {
  const tokA = new Set(a.toLowerCase().split(/\W+/).filter(t => t.length > 1));
  const tokB = new Set(b.toLowerCase().split(/\W+/).filter(t => t.length > 1));
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  return tokA.size === 0 ? 0 : overlap / tokA.size;
}

const shallowTitle = "Senior Technical Officer (STO), Systems Developer";
const extractedTitle = "Senior Technical Officer (STO), Systems Developer at FHI 360";

console.log("Score:", tokenOverlap(shallowTitle, extractedTitle));
