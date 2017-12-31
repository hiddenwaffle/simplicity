import { World } from 'src/domain/world';
import { Entity } from 'src/domain/entity';
import {
  MovementType,
  MovementTarget,
} from 'src/domain/movement';
import { timer } from 'src/session/timer';
import {
  calculateFacing,
  determineDirection,
  Direction,
  DirectionsOfFreedom,
  determineDxDy,
} from 'src/domain/direction';
import { tryAnimationSwitch } from './try-animation-switch';
import { TARGET_FIELD_TILE_SIZE } from 'src/constants';
import { TileTracker } from 'src/game-master/tile-tracker';

export function calculateDxDyIntended(world: World, entity: Entity) {
  switch (entity.movementPlan.type) {
    case MovementType.Wander:
      advanceWander(world, entity);
      break;
    case MovementType.Player:
    case MovementType.Stationary:
    default:
      // Do nothing
  }
}

function advanceWander(world: World, entity: Entity) {
  const plan = entity.movementPlan;
  if (plan.targets.length === 0) {

    // TODO: This is duplicated in walk-entity-to-tiles.ts
    const tilesToCheck = [
      [entity.xtile - 1, entity.ytile - 1], // Top Left       0
      [entity.xtile,     entity.ytile - 1], // Top Middle     1
      [entity.xtile + 1, entity.ytile - 1], // Top Right      2
      [entity.xtile - 1, entity.ytile    ], // Middle Left    3
      [entity.xtile    , entity.ytile    ], // Middle         4
      [entity.xtile + 1, entity.ytile    ], // Middle Right   5
      [entity.xtile - 1, entity.ytile + 1], // Bottom Left    6
      [entity.xtile    , entity.ytile + 1], // Bottom Middle  7
      [entity.xtile + 1, entity.ytile + 1], // Bottom Right   8
    ];

    // TODO: This is duplicated in walk-entity-to-tiles.ts
    const tracker = new TileTracker();

    // TODO: This is duplicated in walk-entity-to-tiles.ts
    for (const layer of world.staticMap.collisionLayers) {
      const tileIntersected = false;
      for (const tileToCheck of tilesToCheck) {
        const xTileToCheck = tileToCheck[0];
        const yTileToCheck = tileToCheck[1];

        // Determine if collision is an actual tile, or a map boundary.
        let tileValue = -1;
        if (xTileToCheck < 0 || xTileToCheck >= layer.width ||
            yTileToCheck < 0 || yTileToCheck >= layer.height) {
          tileValue = 1337; // arbitrary
        } else {
          const index = convertXYToIndex(xTileToCheck, yTileToCheck, layer.width);
          tileValue = layer.tiles[index];
        }

        // Collision possible only if the tile value is a positive number.
        // TODO: Something that allows passthrough layers if specified?
        if (tileValue <= 0) {
          continue;
        }

        const staeCol = (xTileToCheck - entity.xtile) + 1;
        const staeRow = (yTileToCheck - entity.ytile) + 1;
        tracker.setSolid(staeRow, staeCol, true);
      }
    }

    // console.log(solidTilesAroundEntity.join("\n"));

    // Determine open directions
    const openDirections: Direction[] = [];
    if (!tracker.isSolid(0, 0) &&
        !tracker.isSolid(1, 0) &&
        !tracker.isSolid(0, 1)) { openDirections.push(Direction.UpLeft); }
    if (!tracker.isSolid(0, 1)) { openDirections.push(Direction.Up); }
    if (!tracker.isSolid(0, 2) &&
        !tracker.isSolid(0, 1) &&
        !tracker.isSolid(1, 2)) { openDirections.push(Direction.UpRight); }
    if (!tracker.isSolid(1, 0)) { openDirections.push(Direction.Left); }
    if (!tracker.isSolid(1, 2)) { openDirections.push(Direction.Right); }
    if (!tracker.isSolid(2, 0) &&
        !tracker.isSolid(1, 0) &&
        !tracker.isSolid(2, 1)) { openDirections.push(Direction.DownLeft); }
    if (!tracker.isSolid(2, 1)) { openDirections.push(Direction.Down) ; }
    if (!tracker.isSolid(2, 2) &&
        !tracker.isSolid(2, 1) &&
        !tracker.isSolid(1, 2)) { openDirections.push(Direction.DownRight); }

    // TODO: Include "waiting" as an option.
    const actionIndex = Math.floor(Math.random() * openDirections.length);
    const [dxtile, dytile] = determineDxDy(openDirections[actionIndex]);
    const xtileTarget = entity.xtile + dxtile;
    const ytileTarget = entity.ytile + dytile;

    const target = new MovementTarget(
      entity.x,
      entity.y,
      xtileTarget * TARGET_FIELD_TILE_SIZE + (TARGET_FIELD_TILE_SIZE / 2),
      ytileTarget * TARGET_FIELD_TILE_SIZE + (TARGET_FIELD_TILE_SIZE - 2), // -2 to prevent overlap with tiles above and below.
    );
    plan.targets.push(target);
  } else {
    const target = plan.targets[0];

    // TODO: Handle ttl if waiting

    // Determine the direction needed to travel from point A to point B.
    const dxstart = to1(target.x - target.xstart);
    const dystart = to1(target.y - target.ystart);

    // Determine the direction needed to travel from current point to point B.
    const dxprogress = to1(target.x - entity.x);
    const dyprogress = to1(target.y - entity.y);

    // Determine if x and/or y has gotten to the target value.
    const dx = dxstart !== dxprogress ? 0 : dxprogress;
    const dy = dystart !== dyprogress ? 0 : dyprogress;

    // Continue moving if either value has not been reached; otherwise snap to point B.
    entity.x = dx === 0 ? target.x : entity.x;
    entity.y = dy === 0 ? target.y : entity.y;
    entity.dxIntended = dx * 0.25; // TODO: Remove multiplier
    entity.dyIntended = dy * 0.25; // TODO: Remove multiplier

    entity.facing = calculateFacing(
      entity.dxIntended,
      entity.dyIntended,
      entity.facing,
      entity.directionsOfFreedom
    );
    tryAnimationSwitch(entity, true); // TODO: Wandering = walk animation, right?

    if (dx === 0 && dy === 0) {
      plan.targets.shift();
    }
  }
}

/**
 * Convert the given number to 1 or -1, or 0 if given 0.
 */
function to1(value: number): number {
  if (value === 0) {
    return 0;
  } else {
    return value / Math.abs(value);
  }
}

/**
 * TODO: This is duplicated in walk-entity-to-tiles.ts
 */
function convertXYToIndex(x: number, y: number, width: number): number {
  return x + (y * width);
}
