import * as tf from '@tensorflow/tfjs';

export interface ModelWeight {
  shape: number[];
  values: number[];
}

export function createNetwork(seed: number) {
  const model = tf.sequential();
  model.add(tf.layers.gru({
    units: 32,
    inputShape: [20, 9],
    kernelInitializer: tf.initializers.glorotUniform({ seed }),
    recurrentInitializer: tf.initializers.glorotUniform({ seed: seed + 1 }),
  }));
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax',
    kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 2 }),
  }));
  const optimizer = tf.train.adam(0.005);
  model.compile({ optimizer, loss: 'categoricalCrossentropy' });
  return { model, optimizer };
}

export function readWeights(model: tf.Sequential): ModelWeight[] {
  return model.getWeights().map(t => ({ shape: t.shape, values: Array.from(t.dataSync()) }));
}

export function applyWeights(model: tf.Sequential, weights: ModelWeight[]) {
  const tensors = weights.map(w => tf.tensor(w.values, w.shape));
  try { model.setWeights(tensors); } finally { tensors.forEach(t => t.dispose()); }
}
