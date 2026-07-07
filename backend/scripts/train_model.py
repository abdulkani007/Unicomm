import os
import numpy as np

def train_and_save_model():
    print("Initializing synthetic data generation for Sign Language LSTM Model...")
    
    # Model parameters
    SEQUENCE_LENGTH = 30
    FEATURES_DIM = 126 # 21 landmarks * 3 coordinates * 2 hands
    LABELS = ["HELLO", "THANK YOU", "YES", "NO", "PLEASE", "GOODBYE", "HELP", "I LOVE YOU", "SORRY", "WELCOME"]
    NUM_CLASSES = len(LABELS)
    
    # Generate 1000 synthetic training samples
    num_samples = 1000
    X = np.random.randn(num_samples, SEQUENCE_LENGTH, FEATURES_DIM).astype(np.float32)
    
    # Add random patterns for each label to simulate landmark trajectories
    y = np.zeros((num_samples, NUM_CLASSES), dtype=np.float32)
    for i in range(num_samples):
        label_idx = i % NUM_CLASSES
        y[i, label_idx] = 1.0
        # Add basic class-specific offsets to the synthetic features to facilitate convergence
        X[i, :, :] += label_idx * 0.1
        
    print(f"Generated X dataset shape: {X.shape}")
    print(f"Generated y dataset shape: {y.shape}")

    # Import tensorflow locally
    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
        from tensorflow.keras.optimizers import Adam
    except ImportError:
        print("TensorFlow is not installed in the current environment. Unable to run training.")
        return False
        
    print("Building Keras Sequence LSTM model...")
    model = Sequential([
        Input(shape=(SEQUENCE_LENGTH, FEATURES_DIM)),
        LSTM(64, return_sequences=True, activation='tanh'),
        Dropout(0.2),
        LSTM(32, return_sequences=False, activation='tanh'),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dense(NUM_CLASSES, activation='softmax')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    model.summary()
    
    print("Training model for 5 epochs to establish baseline weights...")
    model.fit(X, y, epochs=5, batch_size=32, validation_split=0.2)
    
    # Define assets output directory
    output_dir = "assets"
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "sign_model.h5")
    
    print(f"Saving compiled baseline weights to {model_path}...")
    model.save(model_path)
    print("Model training pipeline completed successfully.")
    return True

if __name__ == "__main__":
    train_and_save_model()
