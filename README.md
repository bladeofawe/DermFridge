## DermFridge AI

This project presents an AI-powered personal assistant designed to connect nutrition and skincare through intelligent data analysis. By combining facial image recognition with food identification, the system determines the user’s skin type and analyzes the contents of their refrigerator to recommend personalized meals, snacks, and beverages that promote healthier skin. Beyond personalized dietary guidance, the application encourages users to make optimal use of their available ingredients, thus reducing food waste. Driven by the rise of personalized health technologies, the popularity of skincare beauty in South Korea, and the increasing accessibility of computer vision tools, this assistant bridges the gap between skincare and nutrition-focused applications. It supports both personal well-being and environmental sustainability by helping users understand the impact of dietary habits on their skin condition and guiding them toward smarter, skin-friendly food choices. Ultimately, the project aims to empower users to maintain healthy skin naturally while fostering more sustainable and informed eating practices.


| Name                     | Organization        | Email                                  |
|--------------------------|---------------------|----------------------------------------|
| Daniel Vaughn Kenneth    | Computer Science    | [vaughndanielsiburian@gmail.com)       |
| Amina Lahraoui           | Computer Science    | [aminalahraoui12@gmail.com)            |
| Leo Belarbi              | Computer Science    | [leomehdibelarbi@gmail.com)            |
| Shajnin Howlader         | Computer Science    | [Shajninhowlader@gmail.com)            |
| Henrik Lam               | Computer Science    | [henriklam5555@gmail.com)              |



<img width="1658" height="881" alt="image" src="https://github.com/user-attachments/assets/775a34e9-6bf6-4285-ba1b-db025263708b" />


I. Introduction

- Coming to South Korea to study abroad, some of our members immediately noticed the prevalence of skincare, clinics, and skin analysis being offered at many stores to market their own products as a solution to any skin issues. We were inspired by skin analysis's and wanted to combine it with out coding and our assignment with working with an LG products. This is where the DermFridge AI came to be. 

- We hope to see a viable product, whether it is on LG fridges, or becoming a stronger app for consumers. We hope to provide users an alternative to traveling to skincare clinics, especially those living outside of Korea, to have the comfort of checking and working on their skin's health, daily at home. Additionally, we hope to save money for users, as they can rely on their fridge nutrition more for skincare.

II. — Dataset

The project relies on two main types of datasets: facial skin analysis datasets and food image classification datasets. Both are required for the system to accurately detect the user’s skin condition and identify the food items available in their refrigerator.

Skin Dataset:
For the facial analysis component, publicly available dermatology-focused image datasets were evaluated. These datasets contain labeled images representing different skin types and conditions such as acne, oiliness, dryness, redness, and wrinkles. Before training, the images are first going through preprocessing steps including size normalization, brightness correction, etc. This improves the model’s accuracy when analyzing user-provided images taken in uncontrolled environments. 

Food Dataset:
To support food detection and fridge inventory identification, an open-source food image dataset was used. It includes commonly stored food categories such as vegetables, fruits, beverages, dairy, and packaged items. Each food item includes an associated label and metadata (such as nutritional profile, category) allowing the system to connect food in fridge with health recommendations. The dataset was used alongside pretrained YOLOv8 weights, reducing required training time and improving accuracy, especially for similar items.

III — Methodology

The methodology consists of three main components: the facial skin analysis model, the food recognition model, and the recommendation system that connects both outputs. Together, these modules form the core logic of the DermFridge assistant.

Facial Skin Analysis Method:
The system first processes a selfie or live camera input. A pretrained model detects the face and extracts skin features including texture, tone variation, oil level, hydration indicators, and the presence of acne or wrinkles. These extracted features are interpreted and classified into a structured skin profile (e.g., oily, dry, acne-prone, balanced). The model then uses dermatology-trained references to identify potential nutritional deficiencies related to the detected skin condition.

Food Recognition Method:
For fridge inventory detection, an image of the refrigerator contents is processed using a YOLOv8-based computer vision model. The system identifies each food item and assigns a confidence score. Once identified, each item is matched with a nutritional database entry containing minerals, vitamins, antioxidants, or other relevant values. You can also manually input a fridge item if the model does not correctly identify the item. 

Recommendation system:
After both analyses are complete, the system compares the user’s skin profile with the available food items detected in the fridge. Based on nutritional relevance, it generates personalized suggestions such as foods that may help improve specific skin conditions, foods that should be avoided, and missing ingredients that could be beneficial. The recommendations are presented in a simple format so the user can clearly understand why each item is suggested. 
