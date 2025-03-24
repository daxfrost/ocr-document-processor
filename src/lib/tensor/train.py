import tensorflow as tf
import numpy as np
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing import image

def load_datasets(dataset_dir, img_height=180, img_width=180, batch_size=32, validation_split=0.2, seed=123):
    # Create training dataset
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        dataset_dir,
        validation_split=validation_split,
        subset="training",
        seed=seed,
        image_size=(img_height, img_width),
        batch_size=batch_size
    )
    # Store class names before further transforming the dataset
    class_names = train_ds.class_names

    # Create validation dataset
    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        dataset_dir,
        validation_split=validation_split,
        subset="validation",
        seed=seed,
        image_size=(img_height, img_width),
        batch_size=batch_size
    )
    
    # Improve performance with caching and prefetching
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)
    
    return train_ds, val_ds, class_names

def build_model(img_height=180, img_width=180):
    model = models.Sequential([
        # Normalize the input images
        layers.Rescaling(1./255, input_shape=(img_height, img_width, 3)),
        
        # Convolutional layers
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        # Flatten and Dense layers
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dense(2, activation='softmax')  # 2 classes: BOL and invoices
    ])
    return model

def train_model(model, train_ds, val_ds, epochs=10):
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs
    )
    return history

def save_model(model, file_path='bol_invoice_classifier.h5'):
    model.save(file_path)
    print(f"Model saved to {file_path}")

def predict_image(model, img_path, img_height=180, img_width=180, class_names=None):
    # Load and resize the image
    img = image.load_img(img_path, target_size=(img_height, img_width))
    img_array = image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)  # Create a batch of size 1
    
    # Predict the class
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)
    
    if class_names is not None:
        print("Predicted class:", class_names[predicted_class[0]])
    else:
        print("Predicted class index:", predicted_class[0])
    
    return predicted_class

def main():
    # Parameters
    dataset_dir = 'dataset/train'  # Adjust path to your dataset directory
    img_height, img_width = 180, 180
    batch_size = 32
    epochs = 10

    # Load the training and validation datasets and capture the class names
    train_ds, val_ds, class_names = load_datasets(dataset_dir, img_height, img_width, batch_size)
    print("Class names:", class_names)

    # Build the model and print its architecture
    model = build_model(img_height, img_width)
    model.summary()

    # Train the model
    history = train_model(model, train_ds, val_ds, epochs)

    # Save the trained model
    save_model(model, 'bol_invoice_classifier.h5')

    # Optional: Predict on a new image
    # test_img_path = 'dataset/validation/invoices/invoice-example-1.png'  # Replace with your test image path
    # Uncomment the line below once you have a valid test image:
    # predict_image(model, test_img_path, img_height, img_width, class_names)

if __name__ == "__main__":
    main()
