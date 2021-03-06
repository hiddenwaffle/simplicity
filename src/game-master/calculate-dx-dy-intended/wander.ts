import { World } from 'src/domain/world';
import { Entity } from 'src/domain/entity';
import {
  MovementTarget,
} from 'src/domain/movement';
import { timer } from 'src/session/timer';
import {
  calculateFacing,
  Direction,
  determineDxDy,
} from 'src/domain/direction';
import { tryAnimationSwitch } from 'src/game-master/try-animation-switch';
import { TARGET_FIELD_TILE_SIZE } from 'src/constants';
import { TileTracker } from 'src/game-master/tile-tracker';
import { determineTileValueOrMapBoundary } from 'src/math';

export function wander(world: World, entity: Entity) {
  const plan = entity.movementPlan;
  if (!plan.currentTarget) {
    createNewTarget(world, entity);
  }
  headTowardsTarget(world, entity);
}

function createNewTarget(world: World, entity: Entity) {
  const plan = entity.movementPlan;
  const tracker = new TileTracker(entity.xtile, entity.ytile);

  for (const track of tracker.allTracks) {
    for (const layer of world.gameMap.collisionLayers) {
      // Determine if collision is an actual tile, or a map boundary.
      // tslint:disable-next-line:no-unused-variable
      const [tileValue, _mapBoundary] = determineTileValueOrMapBoundary(track.x, track.y, layer);

      // Collision possible only if the tile value is a positive number.
      // TODO: Something that allows passthrough layers if specified?
      if (tileValue > 0) {
        track.solid = true; // TODO: Not necessarily solid; it is non-zero.
      }
    }
  }

  // Determine open directions. "None" means wait.
  const openDirections: Direction[] = tracker.determineOpenDirections();

  const actionIndex = Math.floor(Math.random() * openDirections.length);
  let direction = openDirections[actionIndex];

  let wait = false;
  let ttl = 0;
  const waitRoll = Math.floor(Math.random() * 2); // 50% chance of waiting
  if (waitRoll === 0) {
    direction = Direction.None;
    wait = true;
    ttl = 1000;
  }

  const [dxtile, dytile] = determineDxDy(direction);
  const xtileTarget = entity.xtile + dxtile;
  const ytileTarget = entity.ytile + dytile;

  const target = new MovementTarget(
    xtileTarget * TARGET_FIELD_TILE_SIZE + (TARGET_FIELD_TILE_SIZE / 2),
    // The -2 is to prevent overlap with adjacent tiles: -1 (above) + -1 (below) = -2.
    // Otherwise, xtile/ytile can end up pointed to a solid tile even
    // though the entity is only next to it, and get stuck.
    ytileTarget * TARGET_FIELD_TILE_SIZE + (TARGET_FIELD_TILE_SIZE - 2),
    wait,
    ttl,
  );
  plan.addTarget(target);
}

function headTowardsTarget(world: World, entity: Entity) {
  const plan = entity.movementPlan;
  const target = plan.currentTarget;
  if (!target) {
    return;
  }

  if (!target.initialized) {
    target.initialize(entity.x, entity.y);
  }

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
    entity.directionsOfFreedom,
  );
  tryAnimationSwitch(entity, false); // TODO: Wandering = walk animation, right?

  // Already at destination
  if (dx === 0 && dy === 0) {
    if (target.wait) {
     target.ttl -= timer.elapsed;
     if (target.ttl <= 0) {
       target.wait = false;
     }
    } else {
      plan.setCurrentTargetComplete();
    }
  }
}

/**
 * Convert the given number to 1 or -1, or 0 if given 0.
 */
function to1(value: number): number {
  if (value < 0) {
    return -1;
  } else if (value > 0) {
    return 1;
  } else {
    return 0;
  }
}
