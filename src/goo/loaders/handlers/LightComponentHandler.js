define(['goo/loaders/handlers/ComponentHandler',
	'goo/entities/components/LightComponent',
	'goo/entities/components/PointLight',
	'goo/entities/components/SpotLight',
	'goo/entities/components/DirectionalLight',
	'goo/math/Vector',
	'goo/util/rsvp',
	'goo/util/PromiseUtil',
	'goo/util/ObjectUtil',
	'goo/math/Vector3'
], function(
	ComponentHandler,
	LightComponent,
	PointLight,
	SpotLight,
	DirectionalLight,
	Vector,
	RSVP,
	pu,
	_,
	Vector3
) {
	function LightComponentHandler() {
		ComponentHandler.apply(this, arguments);
	}

	LightComponentHandler.prototype = Object.create(ComponentHandler.prototype);
	LightComponentHandler.prototype.constructor = LightComponentHandler;
	ComponentHandler._registerClass('light', LightComponentHandler);

	LightComponentHandler.prototype._prepare = function(config) {
		_.defaults(config, {
			direction: [0, 0, 0],
			color: [1, 1, 1, 1],
			attenuate: true,
			shadowCaster: false
		});
		if (config.type !== 'DirectionalLight') {
			config.range = config.range || 1000;
		}
		if (config.shadowCaster) {
			config.shadowSettings = config.shadowSettings || {};
			_.defaults(config.shadowSettings, {
				type: 'Blur',
				projection: (config.type === 'DirectionalLight') ? 'Parallel' : 'Perspective',
				fov: 55,
				size: 400,
				near: 1,
				/** @type {number} */
				far: 1000,
				resolution: [512, 512],
				upVector: Vector3.UNIT_Y
			});
		}
	};

	LightComponentHandler.prototype._create = function(entity, config) {
		var light;
		switch(config.type) {
			case 'SpotLight':
				light = new SpotLight();
				break;
			case 'DirectionalLight':
				light = new DirectionalLight();
				break;
			default:
				light = new PointLight();
		}
		var component = new LightComponent(light);
		entity.setComponent(component);
		return component;
	};

	LightComponentHandler.prototype.update = function(entity, config) {
		//var component, key, light, value;
		var component = ComponentHandler.prototype.update.call(this, entity, config);
		var light = component.light;
		for (var key in config) {
			var value = config[key];
			if (light.hasOwnProperty(key)) {
				if (light[key] instanceof Vector) {
					light[key].set(value);
				} else {
					light[key] = _.clone(value);
				}
			}
		}
		return pu.createDummyPromise(component);
	};

	return LightComponentHandler;
});
