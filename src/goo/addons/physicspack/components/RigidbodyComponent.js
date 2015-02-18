define([
	'goo/addons/physicspack/components/AbstractRigidbodyComponent',
	'goo/math/Vector3',
	'goo/math/Quaternion',
	'goo/math/Transform',
	'goo/addons/physicspack/colliders/BoxCollider',
	'goo/addons/physicspack/colliders/SphereCollider',
	'goo/addons/physicspack/colliders/CylinderCollider',
	'goo/addons/physicspack/colliders/PlaneCollider',
	'goo/addons/physicspack/colliders/MeshCollider',
	'goo/addons/physicspack/joints/BallJoint',
	'goo/addons/physicspack/joints/HingeJoint'
],
function (
	AbstractRigidbodyComponent,
	Vector3,
	Quaternion,
	Transform,
	BoxCollider,
	SphereCollider,
	CylinderCollider,
	PlaneCollider,
	MeshCollider,
	BallJoint,
	HingeJoint
) {
	'use strict';

	/* global CANNON */
	var tmpQuat = new Quaternion();
	var tmpCannonVec;
	var tmpCannonVec2;

	/**
	 * Adds rigid body dynamics to your entity. To be used with the {@link PhysicsSystem}. If the entity or its children have {@link ColliderComponent}s, they will be added as collision shapes to the rigid body.
	 * @param {object} [settings]
	 * @param {number} [settings.mass=1]
	 * @param {boolean} [settings.isKinematic=false]
	 * @param {Vector3} [settings.velocity]
	 * @param {Vector3} [settings.angularVelocity]
	 * @param {number} [settings.linearDamping=0.01]
	 * @param {number} [settings.angularDamping=0.05]
	 * @extends AbstractRigidbodyComponent
	 */
	function RigidbodyComponent(settings) {
		settings = settings || {};
		AbstractRigidbodyComponent.apply(this, arguments);

		this.type = 'RigidbodyComponent';

		/**
		 * @type {CANNON.Body}
		 */
		this.cannonBody = null;

		/**
		 * If true, the Cannon.js body will be re-initialized in the next process().
		 * @private
		 * @type {boolean}
		 */
		this._dirty = true;

		/**
		 * @private
		 * @type {boolean}
		 */
		this._isKinematic = !!settings.isKinematic;

		/**
		 * @private
		 * @type {number}
		 */
		this._mass = settings.mass !== undefined ? settings.mass : 1.0;
		if (this._isKinematic) {
			this._mass = 0;
		} else if (this._mass === 0) {
			this._isKinematic = true;
		}

		/**
		 * @private
		 * @type {boolean}
		 */
		this._initialized = false;

		/**
		 * @private
		 * @type {Vector3}
		 */
		this._velocity = settings.velocity ? settings.velocity.clone() : new Vector3();

		/**
		 * @private
		 * @type {Vector3}
		 */
		this._angularVelocity = settings.angularVelocity ? settings.angularVelocity.clone() : new Vector3();

		/**
		 * @private
		 * @type {number}
		 */
		this._linearDamping = settings.linearDamping !== undefined ? settings.linearDamping : 0.01;

		/**
		 * @private
		 * @type {number}
		 */
		this._angularDamping = settings.angularDamping !== undefined ? settings.angularDamping : 0.05;

		/**
		 * @private
		 * @type {number}
		 */
		this._sleepingThreshold = settings.sleepingThreshold !== undefined ? settings.sleepingThreshold : 0.2;

		/**
		 * @private
		 * @type {number}
		 */
		this._sleepingTimeLimit = settings.sleepingTimeLimit !== undefined ? settings.sleepingTimeLimit : 1;

		if (!tmpCannonVec) {
			tmpCannonVec = new CANNON.Vec3();
			tmpCannonVec2 = new CANNON.Vec3();
		}

		/**
		 * All the attached colliders.
		 * @type {Array}
		 */
		this._colliderEntities = [];
	}
	RigidbodyComponent.prototype = Object.create(AbstractRigidbodyComponent.prototype);
	RigidbodyComponent.prototype.constructor = RigidbodyComponent;
	RigidbodyComponent.type = 'RigidbodyComponent';

	/**
	 * Cannon.js uses ConvexPolyhedron shapes for collision checking sometimes (for example, for cylinders). Therefore it needs a number of segments to use.
	 * @type {Number}
	 */
	RigidbodyComponent.numCylinderSegments = 10;

	/**
	 * Get the world transform from the entity and set on the body
	 * @private
	 * @param {Entity} entity
	 */
	RigidbodyComponent.prototype.setTransformFromEntity = function (entity) {
		var transform = entity.transformComponent.worldTransform;
		var body = this.cannonBody;
		body.position.copy(transform.translation);
		tmpQuat.fromRotationMatrix(transform.rotation);
		body.quaternion.copy(tmpQuat);
	};

	/**
	 * @param {Vector3} force
	 */
	RigidbodyComponent.prototype.applyForce = function (force) {
		tmpCannonVec.copy(force);
		tmpCannonVec2.set(0, 0, 0);
		this.cannonBody.applyForce(tmpCannonVec, tmpCannonVec2);
	};

	/**
	 * @param {Vector3} velocity
	 */
	RigidbodyComponent.prototype.setVelocity = function (velocity) {
		if (this.cannonBody) {
			this.cannonBody.velocity.copy(velocity);
		}
		this._velocity.setVector(velocity);
	};

	/**
	 * @param {Vector3} targetVector
	 */
	RigidbodyComponent.prototype.getVelocity = function (targetVector) {
		var body = this.cannonBody;
		var velocity = body ? body.velocity : this._velocity;
		targetVector.setDirect(velocity.x, velocity.y, velocity.z);
	};

	/**
	 * @param {Vector3} angularVelocity
	 */
	RigidbodyComponent.prototype.setAngularVelocity = function (angularVelocity) {
		if (this.cannonBody) {
			this.cannonBody.angularVelocity.copy(angularVelocity);
		}
		this._angularVelocity.setVector(angularVelocity);
	};

	/**
	 * @param {Vector3} targetVector
	 */
	RigidbodyComponent.prototype.getAngularVelocity = function (targetVector) {
		var body = this.cannonBody;
		var angularVelocity = body ? body.angularVelocity : this._angularVelocity;
		targetVector.setDirect(angularVelocity.x, angularVelocity.y, angularVelocity.z);
	};

	/**
	 * @param {Vector3} position
	 */
	RigidbodyComponent.prototype.setPosition = function (position) {
		if (this.cannonBody) {
			this.cannonBody.position.copy(position);
		}
	};

	/**
	 * @param {Vector3} targetVector
	 */
	RigidbodyComponent.prototype.getPosition = function (targetVector) {
		var position = this.cannonBody.position;
		targetVector.setDirect(position.x, position.y, position.z);
	};

	/**
	 * @param {Quaternion} quaternion
	 */
	RigidbodyComponent.prototype.setQuaternion = function (quaternion) {
		if (this.cannonBody) {
			this.cannonBody.quaternion.copy(quaternion);
		}
	};

	/**
	 * @param {Quaternion} targetQuat
	 */
	RigidbodyComponent.prototype.getQuaternion = function (targetQuat) {
		if (this.cannonBody) {
			var cannonQuaternion = this.cannonBody.quaternion;
			targetQuat.setDirect(
				cannonQuaternion.x,
				cannonQuaternion.y,
				cannonQuaternion.z,
				cannonQuaternion.w
			);
		}
	};

	Object.defineProperties(RigidbodyComponent.prototype, {

		/**
		 * @target-class RigidbodyComponent linearDamping member
		 * @type {number}
		 */
		linearDamping: {
			get: function () {
				return this._linearDamping;
			},
			set: function (value) {
				if (this.cannonBody) {
					this.cannonBody.linearDamping = value;
				}
				this._linearDamping = value;
			}
		},

		/**
		 * @target-class RigidbodyComponent angularDamping member
		 * @type {number}
		 */
		angularDamping: {
			get: function () {
				return this._angularDamping;
			},
			set: function (value) {
				if (this.cannonBody) {
					this.cannonBody.angularDamping = value;
				}
				this._angularDamping = value;
			}
		},

		/**
		 * @target-class RigidbodyComponent isKinematic member
		 * @type {number}
		 */
		isKinematic: {
			get: function () {
				return this._isKinematic;
			},
			set: function (value) {
				this._isKinematic = value;
				this._dirty = true;
			}
		},

		/**
		 * @target-class RigidbodyComponent sleepingThreshold member
		 * @type {number}
		 */
		sleepingThreshold: {
			get: function () {
				return this._sleepingThreshold;
			},
			set: function (value) {
				this._sleepingThreshold = value;
				if (this.cannonBody) {
					this.cannonBody.sleepSpeedLimit = value;
				}
			}
		},

		/**
		 * @target-class RigidbodyComponent mass member
		 * @type {number}
		 */
		mass: {
			get: function () {
				return this._mass;
			},
			set: function (value) {
				this._mass = value;
				if (this.cannonBody) {
					this.cannonBody.mass = value;
					this.cannonBody.updateMassProperties();
				}
			}
		},

		/**
		 * @target-class RigidbodyComponent sleepingTimeLimit member
		 * @type {number}
		 */
		sleepingTimeLimit: {
			get: function () {
				return this._sleepingTimeLimit;
			},
			set: function (value) {
				this._sleepingTimeLimit = value;
				if (this.cannonBody) {
					this.cannonBody.sleepTimeLimit = value;
				}
			}
		}
	});

	/**
	 * @private
	 */
	RigidbodyComponent.getCannonShape = function (collider) {
		var shape;
		if (collider instanceof BoxCollider) {
			var halfExtents = new CANNON.Vec3();
			halfExtents.copy(collider.halfExtents);
			shape = new CANNON.Box(halfExtents);
		} else if (collider instanceof SphereCollider) {
			shape = new CANNON.Sphere(collider.radius);
		} else if (collider instanceof PlaneCollider) {
			shape = new CANNON.Plane();
		} else if (collider instanceof CylinderCollider) {
			shape = new CANNON.Cylinder(
				collider.radius,
				collider.radius,
				collider.height,
				RigidbodyComponent.numCylinderSegments
			);
			var quat = new CANNON.Quaternion();
			quat.setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
			shape.transformAllPoints(new Vector3(), quat);
			shape.computeEdges();
			shape.updateBoundingSphereRadius();
		} else if (collider instanceof MeshCollider) {
			// Assume triangles
			if (collider.meshData.indexModes[0] !== 'Triangles') {
				throw new Error('MeshCollider data must be a triangle mesh!');
			}
			shape = new CANNON.Trimesh(
				collider.meshData.getAttributeBuffer('POSITION'),
				collider.meshData.getIndexBuffer()
			);
		} else {
			console.warn('Unhandled collider: ', collider);
		}
		return shape;
	};

	/**
	 * Removes the body from the physics world.
	 * @private
	 */
	RigidbodyComponent.prototype.destroy = function () {
		var body = this.cannonBody;
		if (body) {
			body.world.removeBody(body);
			delete this._system._entities[body.id];
			this.cannonBody = null;
			this._dirty = true;
		}

		// Remove references to colliders
		for (var i = 0; i < this._colliderEntities.length; i++) {
			this._colliderEntities[i].bodyEntity = null;
		}
		this._colliderEntities.length = 0;
	};

	/**
	 * @private
	 */
	RigidbodyComponent.prototype.initialize = function () {
		if (!this._dirty) {
			return;
		}

		this.destroy();

		var body = this.cannonBody = new CANNON.Body({
			mass: this._mass,
			linearDamping: this._linearDamping,
			angularDamping: this._angularDamping,
			sleepSpeedLimit: this._sleepingThreshold,
			sleepTimeLimit: this._sleepingTimeLimit
		});
		this._system.cannonWorld.addBody(body);
		this._system._entities[body.id] = this._entity;

		if (!this._initialized) {
			body.velocity.copy(this._velocity);
			body.angularVelocity.copy(this._angularVelocity);
		}

		this.traverseColliders(this._entity, function (colliderEntity, collider, position, quaternion) {
			this.addCollider(colliderEntity, position, quaternion);
		});
		if (this._isKinematic) {
			body.type = CANNON.Body.KINEMATIC;
		}
		this.setTransformFromEntity(this._entity);

		this._initialized = true;
		this._dirty = false;

		this.emitInitialized(this._entity);
	};

	/**
	 * @private
	 */
	RigidbodyComponent.prototype.initializeJoint = function (joint) {
		var bodyA = this.cannonBody;
		var bodyB = joint.connectedEntity.rigidbodyComponent.cannonBody;
		var constraint;
		if (joint instanceof BallJoint) {

			// Scale the joint to the world scale
			var scaledPivotA = joint.localPivot.clone();
			scaledPivotA.mul(this._entity.transformComponent.transform.scale);

			var pivotInA = new CANNON.Vec3();
			var pivotInB = new CANNON.Vec3();
			pivotInA.copy(scaledPivotA);

			if (joint.autoConfigureConnectedPivot) {
				// Get the local pivot in bodyB
				bodyA.pointToWorldFrame(pivotInA, pivotInB);
				bodyB.pointToLocalFrame(pivotInB, pivotInB);
			} else {
				var worldScaledPivotB = joint.connectedLocalPivot.clone();
				worldScaledPivotB.mul(joint.connectedEntity.transformComponent.transform.scale);
				pivotInB.copy(worldScaledPivotB);
			}

			constraint = new CANNON.PointToPointConstraint(bodyA, pivotInA, bodyB, pivotInB);

		} else if (joint instanceof HingeJoint) {

			var pivotInA = new CANNON.Vec3();
			var pivotInB = new CANNON.Vec3();
			var axisInA = new CANNON.Vec3();
			var axisInB = new CANNON.Vec3();

			// Scale the joint to the world scale
			var scaledPivotA = joint.localPivot.clone();
			scaledPivotA.mul(this._entity.transformComponent.transform.scale);

			// Copy it to cannon vectors
			pivotInA.copy(scaledPivotA);
			axisInA.copy(joint.localAxis);

			if (joint.autoConfigureConnectedPivot) {
				// Get the local pivot in bodyB
				bodyA.pointToWorldFrame(pivotInA, pivotInB);
				bodyB.pointToLocalFrame(pivotInB, pivotInB);
			} else {
				var worldScaledPivotB = joint.connectedLocalPivot.clone();
				worldScaledPivotB.mul(joint.connectedEntity.transformComponent.transform.scale);
				pivotInB.copy(worldScaledPivotB);
			}

			// The axis remains unscaled
			axisInB.copy(joint.localAxis);

			// Get the local axis in bodyB
			bodyA.vectorToWorldFrame(joint.localAxis, axisInB);
			bodyB.vectorToLocalFrame(axisInB, axisInB);

			constraint = new CANNON.HingeConstraint(bodyA, bodyB, {
				pivotA: pivotInA,
				pivotB: pivotInB,
				axisA: axisInA,
				axisB: axisInB,
				collideConnected: joint.collideConnected
			});
		} else {
			console.warn('Unhandled joint: ', joint);
		}

		if (constraint) {
			bodyA.world.addConstraint(constraint);
			joint.cannonJoint = constraint;
		}
	};

	RigidbodyComponent.prototype._updateDirtyColliders = function () {
		var colliderEntities = this._colliderEntities;
		for (var i = 0; i < colliderEntities.length; i++) {
			var entity = colliderEntities[i];
			var colliderComponent = entity.colliderComponent;
			if (colliderComponent._dirty) {
				colliderComponent.updateWorldCollider();
				var collider = colliderComponent.worldCollider;
				var cannonShape = collider.cannonShape;
				if (collider instanceof SphereCollider) {
					cannonShape.radius = collider.radius;
				} else if (collider instanceof MeshCollider) {
					var scale = new CANNON.Vec3();
					scale.copy(collider.scale);
					cannonShape.setScale(scale);
				}
				cannonShape.updateBoundingSphereRadius();
				colliderComponent._dirty = false;
			}
		}
	};

	/**
	 * @private
	 */
	RigidbodyComponent.prototype.destroyJoint = function (joint) {
		var body = this.cannonBody;
		if (body && joint.cannonJoint) {
			body.world.removeConstraint(joint.cannonJoint);
			joint.cannonJoint = null;
		}
	};

	/**
	 * @private
	 */
	RigidbodyComponent.prototype.addCollider = function (entity, position, quaternion) {
		var body = this.cannonBody;
		var cc = entity.colliderComponent;
		cc.updateWorldCollider(true);
		var collider = cc.worldCollider;

		var cannonShape = collider.cannonShape = RigidbodyComponent.getCannonShape(collider);

		// Create a material for the shape
		var mat = new CANNON.Material();
		mat.friction = cc.material ? cc.material.friction : -1;
		mat.restitution = cc.material ? cc.material.restitution : -1;
		cannonShape.material = mat;

		collider.bodyEntity = this;

		cannonShape.collisionResponse = !cc.isTrigger;

		// Add the shape
		var cannonPos = new CANNON.Vec3();
		if (position) {
			cannonPos.copy(position);
		}
		var cannonQuat = new CANNON.Quaternion();
		if (position) {
			cannonQuat.copy(quaternion);
		}
		body.addShape(cannonShape, cannonPos, cannonQuat);

		this._colliderEntities.push(entity);
	};

	/**
	 * @return RigidbodyComponent
	 */
	RigidbodyComponent.prototype.clone = function () {
		return new RigidbodyComponent({
			isKinematic: this._isKinematic,
			mass: this._mass,
			velocity: this._velocity,
			angularVelocity: this._angularVelocity,
			linearDamping: this._linearDamping,
			angularDamping: this._angularDamping,
			sleepingThreshold: this._sleepingThreshold,
			sleepingTimeLimit: this._sleepingTimeLimit
		});
	};

	/**
	 * @private
	 * @param entity
	 */
	RigidbodyComponent.prototype.attached = function (entity) {
		this._entity = entity;
		this._system = entity._world.getSystem('PhysicsSystem');
	};

	RigidbodyComponent.prototype.api = {};

	return RigidbodyComponent;
});