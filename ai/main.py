import io
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import colorsys

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

def apply_sepia(image: Image.Image) -> Image.Image:
    width, height = image.size
    pixels = image.load()

    for py in range(height):
        for px in range(width):
            r, g, b = image.getpixel((px, py))[:3]
            
            tr = int(0.393 * r + 0.769 * g + 0.189 * b)
            tg = int(0.349 * r + 0.686 * g + 0.168 * b)
            tb = int(0.272 * r + 0.534 * g + 0.131 * b)
            
            pixels[px, py] = (min(tr, 255), min(tg, 255), min(tb, 255))
    return image

def apply_hue_rotate(image: Image.Image, degrees: float) -> Image.Image:
    if degrees == 0:
        return image
    
    img = image.convert('RGBA')
    arr = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = arr[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            h = (h + degrees/360.0) % 1.0
            r, g, b = colorsys.hsv_to_rgb(h, s, v)
            arr[x, y] = (int(r*255), int(g*255), int(b*255), a)
            
    return img.convert('RGB')

@app.get("/")
async def root():
    return {"message": "Image Manipulation API"}

def get_form_val(form_data: Dict[str, Any], keys: list, default: Any):
    for k in keys:
        if k in form_data:
            val = form_data[k]
            if isinstance(default, bool):
                return str(val).lower() in ("true", "1", "yes")
            try:
                return float(val) if isinstance(default, float) else int(val)
            except:
                continue
    return default

import json

@app.post("/process-image")
async def process_image(
    request: Request,
    file: UploadFile = File(..., alias="image")
):
    form_data = await request.form()
    print(f"Received form keys: {list(form_data.keys())}")

    # Parse filters JSON if provided
    filters_json = form_data.get("filters", "{}")
    try:
        filters = json.loads(filters_json) if isinstance(filters_json, str) else filters_json
    except json.JSONDecodeError:
        filters = {}
    
    print(f"Parsed filters: {filters}")

    # Extract values from filters JSON or fallback to form fields
    print(f"Extracting - grayscale from filters: {filters.get('grayscale', 'NOT_FOUND')}")
    print(f"Extracting - brightness from filters: {filters.get('brightness', 'NOT_FOUND')}")
    print(f"Extracting - contrast from filters: {filters.get('contrast', 'NOT_FOUND')}")
    
    grayscale = filters.get("grayscale", 0) > 0
    sepia = filters.get("sepia", 0) > 0
    brightness = float(filters.get("brightness", 100))
    contrast = float(filters.get("contrast", 100))
    blur = float(filters.get("blur", 0))
    hue_rotate = float(filters.get("hueRotate", 0))
    saturate = float(filters.get("saturate", 100))
    rotate = float(form_data.get("rotation", 0))
    flip_horizontal = str(form_data.get("flipHorizontal", "false")).lower() in ("true", "1", "yes")
    flip_vertical = str(form_data.get("flipVertical", "false")).lower() in ("true", "1", "yes")

    print(f"Final values: grayscale={grayscale}, sepia={sepia}, brightness={brightness}, contrast={contrast}, blur={blur}, hue_rotate={hue_rotate}, saturate={saturate}, rotate={rotate}, flip_horizontal={flip_horizontal}, flip_vertical={flip_vertical}")

    # Read the image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Apply transforms first
    if rotate != 0:
        print(f"Applying rotation: {rotate}")
        image = image.rotate(rotate, expand=True)

    if flip_horizontal:
        print(f"Applying horizontal flip")
        image = ImageOps.mirror(image)

    if flip_vertical:
        print(f"Applying vertical flip")
        image = ImageOps.flip(image)

    # Apply filters
    if grayscale:
        print(f"Applying grayscale")
        image = ImageOps.grayscale(image).convert("RGB")
    
    if sepia:
        print(f"Applying sepia")
        image = apply_sepia(image)

    if brightness != 100.0:
        print(f"Applying brightness: {brightness}")
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(brightness / 100.0)

    if contrast != 100.0:
        print(f"Applying contrast: {contrast}")
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(contrast / 100.0)

    if saturate != 100.0:
        print(f"Applying saturate: {saturate}")
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(saturate / 100.0)

    if blur > 0:
        print(f"Applying blur: {blur}")
        image = image.filter(ImageFilter.GaussianBlur(radius=blur))

    if hue_rotate != 0:
        print(f"Applying hue_rotate: {hue_rotate}")
        image = apply_hue_rotate(image, hue_rotate)

    # Save to buffer
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
