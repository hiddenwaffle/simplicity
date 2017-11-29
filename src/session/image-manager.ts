import decor0   from 'src/external/DawnLike/Objects/Decor0.png';
import decor1   from 'src/external/DawnLike/Objects/Decor1.png';
import door0    from 'src/external/DawnLike/Objects/Door0.png';
import door1    from 'src/external/DawnLike/Objects/Door1.png';
import effect0  from 'src/external/DawnLike/Objects/Effect0.png';
import effect1  from 'src/external/DawnLike/Objects/Effect1.png';
import fence    from 'src/external/DawnLike/Objects/Fence.png';
import floor    from 'src/external/DawnLike/Objects/Floor.png';
import ground0  from 'src/external/DawnLike/Objects/Ground0.png';
import ground1  from 'src/external/DawnLike/Objects/Ground1.png';
import hill0    from 'src/external/DawnLike/Objects/Hill0.png';
import hill1    from 'src/external/DawnLike/Objects/Hill1.png';
import map0     from 'src/external/DawnLike/Objects/Map0.png';
import map1     from 'src/external/DawnLike/Objects/Map1.png';
import ore0     from 'src/external/DawnLike/Objects/Ore0.png';
import ore1     from 'src/external/DawnLike/Objects/Ore1.png';
import pit0     from 'src/external/DawnLike/Objects/Pit0.png';
import pit1     from 'src/external/DawnLike/Objects/Pit1.png';
import tile     from 'src/external/DawnLike/Objects/Tile.png';
import trap0    from 'src/external/DawnLike/Objects/Trap0.png';
import trap1    from 'src/external/DawnLike/Objects/Trap1.png';
import tree0    from 'src/external/DawnLike/Objects/Tree0.png';
import tree1    from 'src/external/DawnLike/Objects/Tree1.png';
import wall     from 'src/external/DawnLike/Objects/Wall.png';

function onlyFilename(path: string) {
  return path.replace(/.*\//, '');
}

class TileManager {
  private readonly cache: Map<string, HTMLImageElement>;
  private readonly locationMap: Map<string, string>;

  constructor() {
    this.cache = new Map();

    this.locationMap = new Map();
    this.locationMap.set('Decor0.png',  decor0);
    this.locationMap.set('Decor1.png',  decor1);
    this.locationMap.set('Door0.png',   door0);
    this.locationMap.set('Door1.png',   door1);
    this.locationMap.set('Effect0.png', effect0);
    this.locationMap.set('Effect1.png', effect1);
    this.locationMap.set('Fence.png',   fence);
    this.locationMap.set('Floor.png',   floor);
    this.locationMap.set('Ground0.png', ground0);
    this.locationMap.set('Ground1.png', ground1);
    this.locationMap.set('Hill0.png',   hill0);
    this.locationMap.set('Hill1.png',   hill1);
    this.locationMap.set('Map0.png',    map0);
    this.locationMap.set('Map1.png',    map1);
    this.locationMap.set('Ore0.png',    ore0);
    this.locationMap.set('Ore1.png',    ore1);
    this.locationMap.set('Pit0.png',    pit0);
    this.locationMap.set('Pit1.png',    pit1);
    this.locationMap.set('Tile.png',    tile);
    this.locationMap.set('Trap0.png',   trap0);
    this.locationMap.set('Trap1.png',   trap1);
    this.locationMap.set('Tree0.png',   tree0);
    this.locationMap.set('Tree1.png',   tree1);
    this.locationMap.set('Wall.png',    wall);
  }

  prepare(rawImagePath: string) {
    const filename = onlyFilename(rawImagePath);
    const location = this.locationMap.get(filename);
    if (location) {
      this.retrieve(filename, location);
    } else {
      console.log('TileManager#constructor() location not found for:', filename);
    }
  }

  get(rawImagePath: string): HTMLImageElement {
    const filename = onlyFilename(rawImagePath);
    return this.cache.get(filename);
  }

  private retrieve(filename: string, location: string) {
    const img = <HTMLImageElement> document.createElement('img');
    img.onload = () => {
      this.cache.set(filename, img);
    };
    img.src = location;
  }
}

export default new TileManager();
