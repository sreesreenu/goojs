define([
	'goo/math/Vector3',
	'goo/math/Transform',
	'goo/addons/physicspack/colliders/TerrainCollider'
], function (
	Vector3,
	Transform,
	TerrainCollider
) {
	'use strict';

	describe('TerrainCollider', function () {

		it('can clone', function () {
			var collider = new TerrainCollider({
				data: []
			});
			var clone = collider.clone();
			expect(collider).toEqual(clone);

		});

		it('can transform', function () {
			var collider = new TerrainCollider({
				data: [],
				scale: new Vector3(2, 3, 4)
			});
			var transform = new Transform();
			transform.scale.set(1, 2, 3);
			collider.transform(transform, collider);
			expect(collider.scale).toEqual(new Vector3(2, 6, 12));

		});
	});
});