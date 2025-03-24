import sys
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import os


def load_model(model_path: str = 'bol_invoice_classifier.h5'):
    """
    Loads the saved TensorFlow model from the specified path.
    """
    try:
        model = tf.keras.models.load_model(model_path)
        # print(f"Model loaded from {model_path}")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)

def predict_image(model, img_path: str, img_height: int = 180, img_width: int = 180, class_names=None):
    """
    Loads an image, preprocesses it, and uses the model to predict its class.
    """
    try:
        # Load and resize the image
        img = image.load_img(img_path, target_size=(img_height, img_width))
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)

    # Convert image to array and create a batch dimension
    img_array = image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)

    # Predict the class probabilities
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)

    # Map prediction index to class name if provided
    if class_names is not None:
        predicted_label = class_names[predicted_class[0]]
        print("Predicted class:", predicted_label)
    else:
        predicted_label = predicted_class[0]
        print("Predicted class index:", predicted_label)
    
    return predicted_label

if __name__ == '__main__':
    # Ensure an image path is provided as a command-line argument.
    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]

    # Load the model from disk
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'bol_invoice_classifier.h5')
    model = load_model(model_path)

    # Define class names. Adjust if necessary.
    class_names = ["BOL", "INVOICE"]

    # Run prediction on the provided image path
    predict_image(model, image_path, img_height=180, img_width=180, class_names=class_names)

