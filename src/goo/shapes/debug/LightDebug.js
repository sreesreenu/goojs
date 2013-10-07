define([
	'goo/entities/components/MeshData',
	'goo/util/MeshBuilder',
	'goo/math/Transform',
	'goo/shapes/ShapeCreator',
	'goo/entities/components/MeshData',
	'goo/entities/components/MeshRenderer',
	'goo/renderer/Material',
	'goo/renderer/shaders/ShaderLib',
	'goo/math/MathUtils',
	'goo/entities/components/PointLight',
	'goo/entities/components/DirectionalLight',
	'goo/entities/components/SpotLight'
	],
	/* @lends */
	function (
		MeshData,
		MeshBuilder,
		Transform,
		ShapeCreator,
		MeshDataComponent,
		MeshRendererComponent,
		Material,
		ShaderLib,
		MathUtils,
		PointLight,
		DirectionalLight,
		SpotLight
	) {
	"use strict";

	function LightDebug() {
		this._ball = ShapeCreator.createSphere(12, 12, 0.3);
		this._pointLightMesh = LightDebug._buildPointLightMesh();
		this._spotLightMesh = LightDebug._buildSpotLightMesh();
		this._directionalLightMesh = LightDebug._buildDirectionalLightMesh();
	}

	LightDebug.prototype.getMesh = function(light) {
		if (light instanceof PointLight) {
			return [this._ball, this._pointLightMesh];
		} else if (light instanceof SpotLight) {
			return [this._ball, this._spotLightMesh];
		} else if (light instanceof DirectionalLight) {
			return [this._ball, this._directionalLightMesh];
		}
	};

	LightDebug._buildPointLightMesh = function() {
		return buildBall();
	};

	LightDebug._buildSpotLightMesh = function() {
		return buildCone();
	};

	LightDebug._buildDirectionalLightMesh = function() {
		return buildColumn();
	};

	function buildCircle(radius, nSegments) {
		radius = radius || 1;
		nSegments = nSegments || 8;

		var verts = [];
		var indices = [];

		var ak = Math.PI * 2 / nSegments;
		for(var i = 0, k = 0; i < nSegments; i++, k += ak) {
			verts.push(Math.cos(k) * radius, Math.sin(k) * radius, 0);
			indices.push(i, i + 1);
		}
		indices[indices.length - 1] = 0;

		var meshData = new MeshData(MeshData.defaultMap([MeshData.POSITION]), nSegments, indices.length);

		meshData.getAttributeBuffer(MeshData.POSITION).set(verts);
		meshData.getIndexBuffer().set(indices);

		meshData.indexLengths = null;
		meshData.indexModes = ['Lines'];

		return meshData;
	}

	function buildBall() {
		var radius = 1;

		var meshBuilder = new MeshBuilder();
		var nSegments = 128;
		var circle = buildCircle(radius, nSegments);
		var transform;

		transform = new Transform();
		meshBuilder.addMeshData(circle, transform);

		transform = new Transform();
		transform.rotation.fromAngles(0, Math.PI/2, 0);
		transform.update();
		meshBuilder.addMeshData(circle, transform);

		transform = new Transform();
		transform.rotation.fromAngles(Math.PI/2, Math.PI/2, 0);
		transform.update();
		meshBuilder.addMeshData(circle, transform);

		var meshDatas = meshBuilder.build();
		return meshDatas[0];
	}

	function buildUmbrella(nSegments) {
		nSegments = nSegments || 8;

		var verts = [0, 0, 0];
		var indices = [];

		var ak = Math.PI * 2 / nSegments;
		for(var i = 0, k = 0; i < nSegments; i++, k += ak) {
			verts.push(Math.cos(k), Math.sin(k), 1);
			indices.push(0, i + 1);
		}

		var meshData = new MeshData(MeshData.defaultMap([MeshData.POSITION]), nSegments + 1, indices.length);

		meshData.getAttributeBuffer(MeshData.POSITION).set(verts);
		meshData.getIndexBuffer().set(indices);

		meshData.indexLengths = null;
		meshData.indexModes = ['Lines'];

		return meshData;
	}

	function buildCone() {
		var length = -1;

		var meshBuilder = new MeshBuilder();

		var nSegments = 64;
		var nParallel = 2;
		var dxParallel = length / 2;
		var dyParallel = dxParallel;

		for(var i = 1; i <= nParallel; i++) {
			var circle = buildCircle(dyParallel * i, nSegments);
			var transform = new Transform();
			transform.translation.set(0, 0, dxParallel * i);
			transform.update();
			meshBuilder.addMeshData(circle, transform);
		}

		var umbrella = buildUmbrella(4);
		var transform = new Transform();
		transform.scale.set(dyParallel * nParallel, dyParallel * nParallel, dxParallel * nParallel);
		transform.update();
		meshBuilder.addMeshData(umbrella, transform);

		var meshDatas = meshBuilder.build();
		return meshDatas[0];
	}

	function buildTube(nSegments) {
		nSegments = nSegments || 8;

		var verts = [];
		var indices = [];

		var ak = Math.PI * 2 / nSegments;
		for(var i = 0, k = 0; i < nSegments; i++, k += ak) {
			verts.push(Math.cos(k), Math.sin(k), 0);
			verts.push(Math.cos(k), Math.sin(k), 1);
			indices.push(i * 2, i * 2 + 1);
		}

		var meshData = new MeshData(MeshData.defaultMap([MeshData.POSITION]), nSegments * 2, indices.length);

		meshData.getAttributeBuffer(MeshData.POSITION).set(verts);
		meshData.getIndexBuffer().set(indices);

		meshData.indexLengths = null;
		meshData.indexModes = ['Lines'];

		return meshData;
	}

	function buildColumn() {
		var meshBuilder = new MeshBuilder();

		var nSegments = 64;
		var nParallel = 2;
		var dxParallel = 10 / nParallel;
		var radius = 1;

		for(var i = 0; i < nParallel; i++) {
			var circle = buildCircle(radius, nSegments);
			var transform = new Transform();
			transform.translation.set(0, 0, -dxParallel * i);
			transform.update();
			meshBuilder.addMeshData(circle, transform);
		}

		var tube = buildTube(4);
		var transform = new Transform();
		transform.scale.set(radius, radius, -dxParallel * nParallel);
		transform.update();
		meshBuilder.addMeshData(tube, transform);

		var meshDatas = meshBuilder.build();
		return meshDatas[0];
	}

	return LightDebug;
});