/**
 * GradientDescentSolver - Simple, robust constraint solver using gradient descent
 * 100% custom implementation - MIT license compatible
 * No external dependencies, full control
 */

// Re-export primitive types for compatibility
export type IDType = string;

export type PointPrimitive = {
  id: string;
  type: 'point';
  x: number;
  y: number;
  fixed: boolean;
};

export type LinePrimitive = {
  id: string;
  type: 'line';
  p1_id: string;
  p2_id: string;
};

export type CirclePrimitive = {
  id: string;
  type: 'circle';
  c_id: string;
  radius: number;
};

export type ConstraintPrimitive = {
  id: string;
  type: string;
  [key: string]: any;
};

export type Primitive = PointPrimitive | LinePrimitive | CirclePrimitive | ConstraintPrimitive;

/**
 * Point wrapper for internal solver use
 */
class SolverPoint {
  x: number;
  y: number;
  fixed: boolean;
  id: string;

  constructor(id: string, x: number, y: number, fixed: boolean) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.fixed = fixed;
  }
}

/**
 * Base class for all constraints
 */
abstract class Constraint {
  abstract getError(): number;
  abstract applyGradient(learningRate: number): number;
}

/**
 * Distance constraint between two points
 */
class DistanceConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private targetDistance: number
  ) {
    super();
  }

  getError(): number {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const actualDistance = Math.sqrt(dx * dx + dy * dy);
    return actualDistance - this.targetDistance;
  }

  applyGradient(lr: number): number {
    if (this.p1.fixed && this.p2.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.1) return Math.abs(error);

    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Handle degenerate case
    if (dist < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      if (!this.p1.fixed) {
        this.p1.x += Math.cos(angle) * 5;
        this.p1.y += Math.sin(angle) * 5;
      }
      if (!this.p2.fixed) {
        this.p2.x -= Math.cos(angle) * 5;
        this.p2.y -= Math.sin(angle) * 5;
      }
      return this.targetDistance;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const correction = Math.abs(error) * lr * 0.8; // Larger correction factor
    const corr = Math.sign(error) * correction;

    if (!this.p1.fixed) {
      this.p1.x += nx * corr;
      this.p1.y += ny * corr;
    }
    if (!this.p2.fixed) {
      this.p2.x -= nx * corr;
      this.p2.y -= ny * corr;
    }

    return Math.abs(error);
  }
}

/**
 * Horizontal constraint (same Y coordinate)
 */
class HorizontalConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint
  ) {
    super();
  }

  getError(): number {
    return this.p2.y - this.p1.y;
  }

  applyGradient(lr: number): number {
    if (this.p1.fixed && this.p2.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.1) return Math.abs(error);

    const correction = error * lr * 0.5;

    if (!this.p1.fixed) {
      this.p1.y += correction;
    }
    if (!this.p2.fixed) {
      this.p2.y -= correction;
    }

    return Math.abs(error);
  }
}

/**
 * Vertical constraint (same X coordinate)
 */
class VerticalConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint
  ) {
    super();
  }

  getError(): number {
    return this.p2.x - this.p1.x;
  }

  applyGradient(lr: number): number {
    if (this.p1.fixed && this.p2.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.1) return Math.abs(error);

    const correction = error * lr * 0.5;

    if (!this.p1.fixed) {
      this.p1.x += correction;
    }
    if (!this.p2.fixed) {
      this.p2.x -= correction;
    }

    return Math.abs(error);
  }
}

/**
 * Parallel constraint between two line segments
 */
class ParallelConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private p3: SolverPoint,
    private p4: SolverPoint
  ) {
    super();
  }

  getError(): number {
    // Vector A: p1 -> p2
    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;
    // Vector B: p3 -> p4
    const bx = this.p4.x - this.p3.x;
    const by = this.p4.y - this.p3.y;
    // Cross product (should be 0 if parallel)
    return ax * by - ay * bx;
  }

  applyGradient(lr: number): number {
    if (this.p4.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.5) return Math.abs(error);

    // Adjust p4 to make B parallel to A
    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;

    const distB = Math.sqrt(
      Math.pow(this.p4.x - this.p3.x, 2) +
      Math.pow(this.p4.y - this.p3.y, 2)
    );

    const angleA = Math.atan2(ay, ax);

    const targetX = this.p3.x + Math.cos(angleA) * distB;
    const targetY = this.p3.y + Math.sin(angleA) * distB;

    if (!this.p4.fixed) {
      this.p4.x += (targetX - this.p4.x) * lr * 0.3;
      this.p4.y += (targetY - this.p4.y) * lr * 0.3;
    }

    return Math.abs(error);
  }
}

/**
 * Perpendicular constraint between two line segments
 */
class PerpendicularConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private p3: SolverPoint,
    private p4: SolverPoint
  ) {
    super();
  }

  getError(): number {
    // Vector A: p1 -> p2
    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;
    // Vector B: p3 -> p4
    const bx = this.p4.x - this.p3.x;
    const by = this.p4.y - this.p3.y;
    // Dot product (should be 0 if perpendicular)
    return ax * bx + ay * by;
  }

  applyGradient(lr: number): number {
    if (this.p4.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.5) return Math.abs(error);

    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;

    const angleB = Math.atan2(
      this.p4.y - this.p3.y,
      this.p4.x - this.p3.x
    );
    const angleA = Math.atan2(ay, ax);
    const targetAngle = angleA + Math.PI / 2;

    const distB = Math.sqrt(
      Math.pow(this.p4.x - this.p3.x, 2) +
      Math.pow(this.p4.y - this.p3.y, 2)
    );

    const targetX = this.p3.x + Math.cos(targetAngle) * distB;
    const targetY = this.p3.y + Math.sin(targetAngle) * distB;

    if (!this.p4.fixed) {
      this.p4.x += (targetX - this.p4.x) * lr * 0.3;
      this.p4.y += (targetY - this.p4.y) * lr * 0.3;
    }

    return Math.abs(error);
  }
}

/**
 * Coincident constraint (two points at same location)
 */
class CoincidentConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint
  ) {
    super();
  }

  getError(): number {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  applyGradient(lr: number): number {
    if (this.p1.fixed && this.p2.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (error < 0.1) return error;

    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;

    if (!this.p1.fixed) {
      this.p1.x += dx * lr * 0.5;
      this.p1.y += dy * lr * 0.5;
    }
    if (!this.p2.fixed) {
      this.p2.x -= dx * lr * 0.5;
      this.p2.y -= dy * lr * 0.5;
    }

    return error;
  }
}

/**
 * Angle constraint between two line segments
 */
class AngleConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private p3: SolverPoint,
    private p4: SolverPoint,
    private targetAngle: number // in radians
  ) {
    super();
  }

  getError(): number {
    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;
    const bx = this.p4.x - this.p3.x;
    const by = this.p4.y - this.p3.y;

    const angleA = Math.atan2(ay, ax);
    const angleB = Math.atan2(by, bx);

    let diff = angleB - angleA;
    // Normalize to [-π, π]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    return diff - this.targetAngle;
  }

  applyGradient(lr: number): number {
    if (this.p4.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.01) return Math.abs(error);

    const ax = this.p2.x - this.p1.x;
    const ay = this.p2.y - this.p1.y;
    const angleA = Math.atan2(ay, ax);

    const targetAngleB = angleA + this.targetAngle;

    const distB = Math.sqrt(
      Math.pow(this.p4.x - this.p3.x, 2) +
      Math.pow(this.p4.y - this.p3.y, 2)
    );

    const targetX = this.p3.x + Math.cos(targetAngleB) * distB;
    const targetY = this.p3.y + Math.sin(targetAngleB) * distB;

    if (!this.p4.fixed) {
      this.p4.x += (targetX - this.p4.x) * lr * 0.3;
      this.p4.y += (targetY - this.p4.y) * lr * 0.3;
    }

    return Math.abs(error);
  }
}

/**
 * Equal length constraint - two lines must have the same length
 */
class EqualLengthConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private p3: SolverPoint,
    private p4: SolverPoint
  ) {
    super();
  }

  getError(): number {
    const len1 = Math.sqrt(
      Math.pow(this.p2.x - this.p1.x, 2) +
      Math.pow(this.p2.y - this.p1.y, 2)
    );
    const len2 = Math.sqrt(
      Math.pow(this.p4.x - this.p3.x, 2) +
      Math.pow(this.p4.y - this.p3.y, 2)
    );
    return len1 - len2;
  }

  applyGradient(lr: number): number {
    const error = this.getError();
    if (Math.abs(error) < 0.1) return Math.abs(error);

    const dx1 = this.p2.x - this.p1.x;
    const dy1 = this.p2.y - this.p1.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = this.p4.x - this.p3.x;
    const dy2 = this.p4.y - this.p3.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 < 0.01 || len2 < 0.01) return Math.abs(error);

    // Adjust second line to match first line length
    const targetLen2 = len1;
    const scale = targetLen2 / len2;
    const newDx2 = dx2 * scale;
    const newDy2 = dy2 * scale;

    const correction = lr * 0.3;

    if (!this.p4.fixed) {
      const targetX = this.p3.x + newDx2;
      const targetY = this.p3.y + newDy2;
      this.p4.x += (targetX - this.p4.x) * correction;
      this.p4.y += (targetY - this.p4.y) * correction;
    }

    return Math.abs(error);
  }
}

/**
 * Line length constraint - line must have specific length
 */
class LineLengthConstraint extends Constraint {
  constructor(
    private p1: SolverPoint,
    private p2: SolverPoint,
    private targetLength: number
  ) {
    super();
  }

  getError(): number {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const actualLength = Math.sqrt(dx * dx + dy * dy);
    return actualLength - this.targetLength;
  }

  applyGradient(lr: number): number {
    if (this.p1.fixed && this.p2.fixed) return Math.abs(this.getError());

    const error = this.getError();
    if (Math.abs(error) < 0.1) return Math.abs(error);

    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);

    if (currentLength < 0.01) {
      // Degenerate case - separate points
      const angle = Math.random() * Math.PI * 2;
      if (!this.p1.fixed) {
        this.p1.x += Math.cos(angle) * this.targetLength * 0.5;
        this.p1.y += Math.sin(angle) * this.targetLength * 0.5;
      }
      if (!this.p2.fixed) {
        this.p2.x -= Math.cos(angle) * this.targetLength * 0.5;
        this.p2.y -= Math.sin(angle) * this.targetLength * 0.5;
      }
      return this.targetLength;
    }

    const nx = dx / currentLength;
    const ny = dy / currentLength;
    const correction = Math.abs(error) * lr * 0.8; // Larger correction factor
    const corr = Math.sign(error) * correction;

    if (!this.p1.fixed) {
      this.p1.x += nx * corr;
      this.p1.y += ny * corr;
    }
    if (!this.p2.fixed) {
      this.p2.x -= nx * corr;
      this.p2.y -= ny * corr;
    }

    return Math.abs(error);
  }
}

/**
 * Main Gradient Descent Solver
 */
export class GradientDescentSolver {
  private primitives: Primitive[] = [];
  private points: Map<string, SolverPoint> = new Map();
  private constraints: Constraint[] = [];

  // Solver parameters
  private learningRate: number = 0.5;
  private maxLearningRate: number = 0.8;
  private minLearningRate: number = 0.05;
  private maxIterations: number = 200;
  private epsilon: number = 1.0;

  // Statistics
  private errorHistory: number[] = [];
  private historySize: number = 10;

  /**
   * Namespace for accessing sketch primitives (compatibility with assemble2d API)
   */
  sketch_index = {
    get_primitives: () => this.get_primitives()
  };

  /**
   * Load primitives and build constraint system
   */
  push_primitives_and_params(primitives: Primitive[]): void {
    this.clear();
    this.primitives = primitives;

    // First pass: create point entities
    for (const prim of primitives) {
      if (prim.type === 'point') {
        const point = prim as PointPrimitive;
        this.points.set(
          point.id,
          new SolverPoint(point.id, point.x, point.y, point.fixed)
        );
      }
    }

    // Second pass: create constraints
    for (const prim of primitives) {
      this.addConstraintFromPrimitive(prim);
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.primitives = [];
    this.points.clear();
    this.constraints = [];
    this.errorHistory = [];
  }

  /**
   * Create constraint from primitive
   */
  private addConstraintFromPrimitive(prim: any): void {
    const { type } = prim;

    switch (type) {
      case 'point':
      case 'line':
      case 'circle':
        // Not constraints
        break;

      case 'horizontal':
      case 'horizontal_pp':
        const hP1 = this.points.get(prim.p1_id);
        const hP2 = this.points.get(prim.p2_id);
        if (hP1 && hP2) {
          this.constraints.push(new HorizontalConstraint(hP1, hP2));
        }
        break;

      case 'vertical':
      case 'vertical_pp':
        const vP1 = this.points.get(prim.p1_id);
        const vP2 = this.points.get(prim.p2_id);
        if (vP1 && vP2) {
          this.constraints.push(new VerticalConstraint(vP1, vP2));
        }
        break;

      case 'parallel':
      case 'parallel_ll':
        // Need to get points from lines
        const l1 = this.primitives.find(p => p.id === prim.l1_id) as LinePrimitive;
        const l2 = this.primitives.find(p => p.id === prim.l2_id) as LinePrimitive;
        if (l1 && l2) {
          const p1 = this.points.get(l1.p1_id);
          const p2 = this.points.get(l1.p2_id);
          const p3 = this.points.get(l2.p1_id);
          const p4 = this.points.get(l2.p2_id);
          if (p1 && p2 && p3 && p4) {
            this.constraints.push(new ParallelConstraint(p1, p2, p3, p4));
          }
        }
        break;

      case 'perpendicular':
      case 'perpendicular_ll':
        const pL1 = this.primitives.find(p => p.id === prim.l1_id) as LinePrimitive;
        const pL2 = this.primitives.find(p => p.id === prim.l2_id) as LinePrimitive;
        if (pL1 && pL2) {
          const p1 = this.points.get(pL1.p1_id);
          const p2 = this.points.get(pL1.p2_id);
          const p3 = this.points.get(pL2.p1_id);
          const p4 = this.points.get(pL2.p2_id);
          if (p1 && p2 && p3 && p4) {
            this.constraints.push(new PerpendicularConstraint(p1, p2, p3, p4));
          }
        }
        break;

      case 'p2p_distance':
      case 'distance':
        const dP1 = this.points.get(prim.p1_id);
        const dP2 = this.points.get(prim.p2_id);
        if (dP1 && dP2 && prim.distance !== undefined) {
          this.constraints.push(new DistanceConstraint(dP1, dP2, prim.distance));
        }
        break;

      case 'coincident':
      case 'p2p_coincident':
        const cP1 = this.points.get(prim.p1_id);
        const cP2 = this.points.get(prim.p2_id);
        if (cP1 && cP2) {
          this.constraints.push(new CoincidentConstraint(cP1, cP2));
        }
        break;

      case 'angle':
      case 'l2l_angle':
      case 'l2l_angle_ll':
        const aL1 = this.primitives.find(p => p.id === prim.l1_id) as LinePrimitive;
        const aL2 = this.primitives.find(p => p.id === prim.l2_id) as LinePrimitive;
        if (aL1 && aL2 && prim.angle !== undefined) {
          const p1 = this.points.get(aL1.p1_id);
          const p2 = this.points.get(aL1.p2_id);
          const p3 = this.points.get(aL2.p1_id);
          const p4 = this.points.get(aL2.p2_id);
          if (p1 && p2 && p3 && p4) {
            this.constraints.push(new AngleConstraint(p1, p2, p3, p4, prim.angle));
          }
        }
        break;

      case 'equal_length':
        const eL1 = this.primitives.find(p => p.id === prim.l1_id) as LinePrimitive;
        const eL2 = this.primitives.find(p => p.id === prim.l2_id) as LinePrimitive;
        if (eL1 && eL2) {
          const p1 = this.points.get(eL1.p1_id);
          const p2 = this.points.get(eL1.p2_id);
          const p3 = this.points.get(eL2.p1_id);
          const p4 = this.points.get(eL2.p2_id);
          if (p1 && p2 && p3 && p4) {
            this.constraints.push(new EqualLengthConstraint(p1, p2, p3, p4));
          }
        }
        break;

      case 'line_length':
      case 'length':
        const lL = this.primitives.find(p => p.id === prim.l_id) as LinePrimitive;
        if (lL && prim.length !== undefined) {
          const p1 = this.points.get(lL.p1_id);
          const p2 = this.points.get(lL.p2_id);
          if (p1 && p2) {
            this.constraints.push(new LineLengthConstraint(p1, p2, prim.length));
          }
        }
        break;

      default:
        console.warn(`[GradientDescentSolver] Unknown constraint type: ${type}`);
    }
  }

  /**
   * Solve constraints
   */
  async solve(): Promise<boolean> {
    const constraintCount = this.constraints.length;
    if (constraintCount === 0) {
      return true;
    }

    let previousError = Infinity;
    let noImprovementCount = 0;

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let totalError = 0;

      // Apply all constraints
      for (const constraint of this.constraints) {
        const error = constraint.applyGradient(this.learningRate);
        totalError += error;
      }

      // Track error history
      this.errorHistory.push(totalError);
      if (this.errorHistory.length > this.historySize) {
        this.errorHistory.shift();
      }

      // Check convergence
      if (totalError < this.epsilon) {
        return true;
      }

      // Adaptive learning rate - more aggressive improvement
      if (totalError < previousError * 0.98) {
        this.learningRate = Math.min(this.learningRate * 1.1, this.maxLearningRate);
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      // Detect oscillation and reduce learning rate
      if (this.isOscillating()) {
        this.learningRate *= 0.5;
        this.learningRate = Math.max(this.learningRate, this.minLearningRate);
        this.errorHistory = []; // Reset history after correction
      }

      // Early stopping - only if truly stuck
      if (noImprovementCount > 100) {
        // Give up only if error is very high
        if (totalError > 10.0) {
          console.warn(`[Solver] Failed to converge (error: ${totalError.toFixed(1)})`);
          this.logConstraintErrors();
          return false;
        }
        // Accept if error is reasonable
        return true;
      }

      previousError = totalError;
    }

    // Reached max iterations - check final error
    const finalError = this.constraints.reduce((sum, c) => sum + Math.abs(c.getError()), 0);
    if (finalError > 10.0) {
      console.warn(`[Solver] Max iterations reached (error: ${finalError.toFixed(1)})`);
      this.logConstraintErrors();
      return false;
    }
    // Accept if error is reasonable
    return true;
  }

  /**
   * Log which constraints are contributing to the error
   */
  private logConstraintErrors(): void {
    console.group('[Solver] Constraint Errors:');

    const constraintErrors: Array<{ prim: any; error: number }> = [];

    for (let i = 0; i < this.primitives.length; i++) {
      const prim = this.primitives[i];
      if (prim.type === 'point' || prim.type === 'line' || prim.type === 'circle') continue;

      let error = 0;

      if (prim.type === 'p2p_distance' || prim.type === 'distance') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          error = Math.abs(dist - prim.distance);
        }
      } else if (prim.type === 'horizontal_pp' || prim.type === 'horizontal') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          error = Math.abs(p2.y - p1.y);
        }
      } else if (prim.type === 'vertical_pp' || prim.type === 'vertical') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          error = Math.abs(p2.x - p1.x);
        }
      }

      if (error > 0.1) {
        constraintErrors.push({ prim, error });
      }
    }

    // Sort by error descending
    constraintErrors.sort((a, b) => b.error - a.error);

    // Log top 10 errors
    const topErrors = constraintErrors.slice(0, 10);
    for (const { prim, error } of topErrors) {
      if (prim.type === 'p2p_distance') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          const actual = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          console.log(`  ${prim.type} [${prim.p1_id}-${prim.p2_id}]: want ${prim.distance.toFixed(1)}, got ${actual.toFixed(1)}, error: ${error.toFixed(1)}`);
        }
      } else {
        console.log(`  ${prim.type} [${prim.p1_id}-${prim.p2_id}]: error ${error.toFixed(1)}`);
      }
    }

    console.log(`\nTotal constraints: ${constraintErrors.length}, showing top ${topErrors.length}`);
    console.groupEnd();
  }

  /**
   * Detect if error is oscillating
   */
  private isOscillating(): boolean {
    if (this.errorHistory.length < this.historySize) return false;

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < this.errorHistory.length; i++) {
      if (this.errorHistory[i] > this.errorHistory[i - 1]) {
        increasing++;
      } else {
        decreasing++;
      }
    }

    const oscillationRatio = Math.min(increasing, decreasing) / (this.errorHistory.length - 1);
    return oscillationRatio > 0.4;
  }

  /**
   * Apply solved values back to system (no-op for gradient descent)
   */
  apply_solution(): void {
    // Values are already updated in place
  }

  /**
   * Get primitives with updated values
   */
  get_primitives(): Primitive[] {
    const updatedPrimitives: Primitive[] = [];

    for (const prim of this.primitives) {
      if (prim.type === 'point') {
        const point = prim as PointPrimitive;
        const solverPoint = this.points.get(point.id);

        if (solverPoint) {
          updatedPrimitives.push({
            ...point,
            x: solverPoint.x,
            y: solverPoint.y
          });
        } else {
          updatedPrimitives.push(prim);
        }
      } else {
        // Lines, circles, constraints - unchanged
        updatedPrimitives.push(prim);
      }
    }

    return updatedPrimitives;
  }

  /**
   * Validate constraints after solving (only log errors, not successes)
   */
  private validateConstraints(): void {
    for (const prim of this.primitives) {
      if (prim.type === 'p2p_distance' || prim.type === 'distance') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          const actualDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          const error = Math.abs(actualDist - prim.distance);
          if (error > 1.0) {
            console.warn(`[Solver] Distance constraint unsatisfied: expected=${prim.distance.toFixed(1)}, actual=${actualDist.toFixed(1)}`);
          }
        }
      } else if (prim.type === 'horizontal') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          const error = Math.abs(p2.y - p1.y);
          if (error > 1.0) {
            console.warn(`[Solver] Horizontal constraint unsatisfied: error=${error.toFixed(1)}`);
          }
        }
      } else if (prim.type === 'vertical') {
        const p1 = this.points.get(prim.p1_id);
        const p2 = this.points.get(prim.p2_id);
        if (p1 && p2) {
          const error = Math.abs(p2.x - p1.x);
          if (error > 1.0) {
            console.warn(`[Solver] Vertical constraint unsatisfied: error=${error.toFixed(1)}`);
          }
        }
      }
    }
  }
}
