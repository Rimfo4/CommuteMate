function getDistance(currentLat, currentLng, lat, lng) {
  function degToRad(deg) {
    // 각도(degree) -> 라디안(radian)
    return deg * (Math.PI / 180);
  }

  var R = 6371; // 지구에서 반지름 km로
  var dLat = degToRad(lat - currentLat);
  var dLng = degToRad(lng - currentLng);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(currentLat)) *
      Math.cos(degToRad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var distance = R * c; // 거리 -> km로
  return distance;
}
