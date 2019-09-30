const parseCollectionNumber = (n: number): string => {
  const res = n.toString(10);
  if (res.length === 0) return '000';
  if (res.length === 1) return `00${res}`;
  if (res.length === 2) return `0${res}`;
  return res;
};

export default parseCollectionNumber;
