export interface RectItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomLayout {
  wallBandHeight: number;
  wallDividerY: number;
  leftZone: RectItem;
  rightZone: RectItem;
  furniture: {
    sofaMain: RectItem;
    coffeeTable: RectItem;
    diningTable: RectItem;
    chairs: RectItem[];
    bedFrame: RectItem;
    bedMattress: RectItem;
    bedPillow: RectItem;
    sideTables: RectItem[];
    sofaSecondary: RectItem;
  };
}

export const getRoomLayout = (worldWidth: number, worldHeight: number): RoomLayout => {
  const wallBandHeight = worldHeight * 0.34;
  const wallDividerY = wallBandHeight - 12;

  const leftZone: RectItem = {
    x: worldWidth * 0.05,
    y: worldHeight * 0.08,
    w: worldWidth * 0.42,
    h: worldHeight * 0.2
  };

  const rightZone: RectItem = {
    x: worldWidth * 0.53,
    y: worldHeight * 0.08,
    w: worldWidth * 0.42,
    h: worldHeight * 0.2
  };

  const sofaMain: RectItem = {
    x: worldWidth * 0.08,
    y: worldHeight * 0.45,
    w: worldWidth * 0.2,
    h: worldHeight * 0.1
  };

  const coffeeTable: RectItem = {
    x: worldWidth * 0.33,
    y: worldHeight * 0.47,
    w: worldWidth * 0.16,
    h: worldHeight * 0.07
  };

  const diningTable: RectItem = {
    x: worldWidth * 0.53,
    y: worldHeight * 0.43,
    w: worldWidth * 0.18,
    h: worldHeight * 0.1
  };

  const chairW = worldWidth * 0.035;
  const chairH = worldHeight * 0.05;
  const chairs: RectItem[] = [
    { x: diningTable.x - chairW * 0.7, y: diningTable.y - chairH * 0.9, w: chairW, h: chairH },
    { x: diningTable.x + diningTable.w - chairW * 0.3, y: diningTable.y - chairH * 0.9, w: chairW, h: chairH },
    { x: diningTable.x - chairW * 0.7, y: diningTable.y + diningTable.h - chairH * 0.1, w: chairW, h: chairH },
    { x: diningTable.x + diningTable.w - chairW * 0.3, y: diningTable.y + diningTable.h - chairH * 0.1, w: chairW, h: chairH }
  ];

  const bedFrame: RectItem = {
    x: worldWidth * 0.75,
    y: worldHeight * 0.42,
    w: worldWidth * 0.2,
    h: worldHeight * 0.17
  };

  const bedMattress: RectItem = {
    x: bedFrame.x + worldWidth * 0.007,
    y: bedFrame.y + worldHeight * 0.01,
    w: bedFrame.w - worldWidth * 0.014,
    h: bedFrame.h - worldHeight * 0.02
  };

  const bedPillow: RectItem = {
    x: bedMattress.x + bedMattress.w * 0.67,
    y: bedMattress.y + bedMattress.h * 0.06,
    w: bedMattress.w * 0.23,
    h: bedMattress.h * 0.2
  };

  const sideTables: RectItem[] = [
    { x: bedFrame.x - worldWidth * 0.035, y: bedFrame.y + worldHeight * 0.03, w: worldWidth * 0.028, h: worldHeight * 0.065 },
    { x: bedFrame.x + bedFrame.w + worldWidth * 0.007, y: bedFrame.y + worldHeight * 0.03, w: worldWidth * 0.028, h: worldHeight * 0.065 }
  ];

  const sofaSecondary: RectItem = {
    x: worldWidth * 0.6,
    y: worldHeight * 0.68,
    w: worldWidth * 0.2,
    h: worldHeight * 0.09
  };

  return {
    wallBandHeight,
    wallDividerY,
    leftZone,
    rightZone,
    furniture: {
      sofaMain,
      coffeeTable,
      diningTable,
      chairs,
      bedFrame,
      bedMattress,
      bedPillow,
      sideTables,
      sofaSecondary
    }
  };
};
