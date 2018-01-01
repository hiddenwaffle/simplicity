import { SaveStaticMap } from 'src/session/save';
import { log } from 'src/log';
import { TileLayer } from './tile-layer';
import { CollisionLayer } from './collision-layer';
import { Tileset } from './tileset';
import { Entity } from './entity';
import { MapEntrance } from './map-entrance';
import { ObjectHint } from './object-hint';
import { timer } from 'src/session/timer';

class BlinkGroup {
  private readonly layers: TileLayer[];
  private current: number;
  private ttl: number;

  constructor() {
    this.layers = [];
    this.current = 0;
    this.ttl = 0;
  }

  add(layer: TileLayer) {
    this.layers.push(layer);
  }

  /**
   * Ensure blink order and start with the first layer.
   */
  start() {
    if (this.layers.length === 0) {
      return;
    }

    this.layers.sort();
    for (const layer of this.layers) {
      layer.hidden = true;
    }
    const currentLayer = this.layers[0];
    currentLayer.hidden = false;
    this.ttl = currentLayer.blinkWait;
  }

  step() {
    if (this.layers.length === 0) {
      return;
    }
    const currentLayer = this.layers[this.current];
    if (!currentLayer) {
      return;
    }

    this.ttl -= timer.elapsed;
    if (this.ttl <= 0) {
      currentLayer.hidden = true;
      this.current += 1;
      if (this.current >= this.layers.length) {
        this.current = 0;
      }
      const newCurrentLayer = this.layers[this.current];
      if (newCurrentLayer) {
        newCurrentLayer.hidden = false;
        this.ttl = newCurrentLayer.blinkWait - this.ttl;
      }
    }
  }
}

export class StaticMap {
  id: string;
  width: number;
  height: number;

  tileLayers: TileLayer[];
  collisionLayers: CollisionLayer[];
  entrances: MapEntrance[];
  objectHints: ObjectHint[];
  readonly blinkGroups: Map<string, BlinkGroup>;

  tilesets: Tileset[];

  readonly startCall: string;

  constructor(mapId: string, rawMap: any) {
    this.id = mapId;
    this.width = rawMap && rawMap.width;
    this.height = rawMap.height;

    this.tileLayers = [];
    this.collisionLayers = [];
    this.entrances = [];
    this.objectHints = [];
    rawMap.layers.forEach((layer: any) => {
      this.parseAndAddLayers(layer);
    });
    this.blinkGroups = determineBlinkGroups(this.tileLayers);

    this.tilesets = [];
    rawMap.tilesets.forEach((rawTileset: any) => {
      const tileset = new Tileset(rawTileset);
      this.tilesets.push(tileset);
    });

    // Read properties
    {
      // Prevent null pointer errors
      const properties = rawMap.properties || {};

      this.startCall = properties.startCall;
    }
  }

  step() {
    for (const group of Array.from(this.blinkGroups.values())) {
      group.step();
    }
  }

  extractSave(): SaveStaticMap {
    // These are static so there is not much to save.
    return new SaveStaticMap(this.id);
  }

  private parseAndAddLayers(layer: any) {
    switch (layer.type) {
      case 'tilelayer':
        this.parseAndAddTileLayer(layer);
        break;
      case 'objectgroup':
        this.parseAndAddObjectGroupLayer(layer);
        break;
      case 'group':
        this.parseAndAddGroupLayer(layer);
        break;
      // TODO: Do something else with the other layer types/names
      default:
        log('warn', `Unknown layer type ${layer.type}`);
        break;
    }
  }

  private parseAndAddTileLayer(layer: any) {
    if (layer.name.startsWith('@collision')) {
      this.parseAndAddCollisionLayer(layer);
    } else {
      const tileLayer = new TileLayer(layer);
      this.tileLayers.push(tileLayer);
    }
  }

  private parseAndAddCollisionLayer(layer: any) {
    const collisionLayer = new CollisionLayer(layer);
    this.collisionLayers.push(collisionLayer);
  }

  private parseAndAddObjectGroupLayer(layer: any) {
    switch (layer.name) {
      case '@entrances':
        this.parseAndAddEntrance(layer);
        break;
      default:
        this.parseAndAddObjectHints(layer);
        break;
    }
  }

  private parseAndAddEntrance(layer: any) {
    if (layer.objects) {
      for (const object of layer.objects) {
        const entrance = new MapEntrance(object);
        this.entrances.push(entrance);
      }
    }
  }

  private parseAndAddObjectHints(layer: any) {
    if (layer.objects) {
      for (const object of layer.objects) {
        const hint = new ObjectHint(object);
        this.objectHints.push(hint);
      }
    }
  }

  private parseAndAddGroupLayer(layer: any) {
    layer.layers.forEach((sublayer: any) => {
      this.parseAndAddLayers(sublayer);
    });
  }
}

function determineBlinkGroups(layers: TileLayer[]): Map<string, BlinkGroup> {
  const groups: Map<string, BlinkGroup> = new Map();
  for (const layer of layers) {
    const name = layer.blinkGroup;
    if (name) {
      const wait = layer.blinkWait;
      let group = groups.get(name);
      if (!group) {
        group = new BlinkGroup();
        groups.set(name, group);
      }
      group.add(layer);
    }
  }
  for (const group of Array.from(groups.values())) {
    group.start();
  }
  return groups;
}
