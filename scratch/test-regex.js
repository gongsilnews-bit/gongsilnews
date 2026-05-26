const propertyName = "경기도 평택시 장당동 483-6 201호 근린생활시설";
const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
console.log("Match:", addrMatch);
if (addrMatch) {
  console.log("Match[1]:", addrMatch[1]);
}
