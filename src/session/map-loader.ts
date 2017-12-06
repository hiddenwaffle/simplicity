import StaticMap from 'src/domain/static-map';

import start from 'src/external/map/start.map.json';
// TODO: More maps

class MapLoader {
  private readonly rawMaps: Map<string, any>;
  private readonly paths: Map<string, string>;

  constructor() {
    this.rawMaps = new Map();

    this.paths = new Map();
    this.paths.set('start', start);
  }

  fetch(mapId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const path = this.paths.get(mapId);
      const rawMap = this.rawMaps.get(path);
      if (rawMap) {
        resolve(rawMap);
      } else {
        fetch(path).then((response) => {
          return response.json();
        }).then((fetchedRawMap: any) => {
          this.rawMaps.set(path, rawMap);
          resolve(fetchedRawMap);
        }); // TODO: Handle error?
      }
    });
  }
}

export default new MapLoader();