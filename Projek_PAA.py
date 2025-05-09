import pygame
import random
from queue import PriorityQueue
import math
from tkinter import Tk
from tkinter.filedialog import askopenfilename
from PIL import Image

# Inisialisasi Pygame
pygame.init()

# Ukuran grid
GRID_SIZE = 20
COLS, ROWS = 50, 30
SCREEN_WIDTH, SCREEN_HEIGHT = COLS * GRID_SIZE, ROWS * GRID_SIZE
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Smart Courier")

# Warna
WHITE, GRAY, YELLOW, RED, BLACK, BLUE, LIGHT_GRAY, GREEN = (
    (255, 255, 255), (90, 90, 90), (255, 255, 0), (255, 0, 0),
    (0, 0, 0), (0, 0, 255), (200, 200, 200), (0, 255, 0)
)

# Font
font = pygame.font.SysFont("Arial", 24, bold=True)

# Grid default: semua tembok (putih)
grid_map = [[1 for _ in range(COLS)] for _ in range(ROWS)]

def load_image_map():
    Tk().withdraw()
    file_path = askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp")])
    if file_path:
        image = Image.open(file_path).convert("L")
        image = image.resize((COLS, ROWS))
        global grid_map
        grid_map = []
        for y in range(ROWS):
            row = []
            for x in range(COLS):
                pixel = image.getpixel((x, y))
                row.append(0 if pixel < 128 else 1)
            grid_map.append(row)

def is_road(x, y):
    col, row = x // GRID_SIZE, y // GRID_SIZE
    if 0 <= col < COLS and 0 <= row < ROWS:
        return grid_map[row][col] == 0
    return False

def a_star(start, goal):
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    open_set = PriorityQueue()
    open_set.put((0, start))
    came_from = {}
    g_score = {start: 0}

    while not open_set.empty():
        _, current = open_set.get()
        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            return path[::-1]

        for dx, dy in [(-GRID_SIZE, 0), (GRID_SIZE, 0), (0, -GRID_SIZE), (0, GRID_SIZE)]:
            neighbor = (current[0] + dx, current[1] + dy)
            if 0 <= neighbor[0] < SCREEN_WIDTH and 0 <= neighbor[1] < SCREEN_HEIGHT:
                if is_road(neighbor[0], neighbor[1]):
                    tentative_g_score = g_score[current] + 1
                    if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        f_score = tentative_g_score + heuristic(neighbor, goal)
                        open_set.put((f_score, neighbor))
    return []

class Courier:
    def __init__(self, x, y):
        self.x, self.y = x, y
        self.path = []
        self.moving = False
        self.angle = 0

    def move(self):
        if self.path:
            prev_x, prev_y = self.x, self.y
            self.x, self.y = self.path.pop(0)
            dx, dy = self.x - prev_x, self.y - prev_y
            if dx != 0 or dy != 0:
                self.angle = math.degrees(math.atan2(-dy, dx))

    def draw(self):
        center_x = self.x + GRID_SIZE // 2
        center_y = self.y + GRID_SIZE // 2
        length = 10
        width = 8
        angle_rad = math.radians(self.angle)
        front = (center_x + length * math.cos(angle_rad), center_y - length * math.sin(angle_rad))
        left = (center_x + width * math.cos(angle_rad + 2.3), center_y - width * math.sin(angle_rad + 2.3))
        right = (center_x + width * math.cos(angle_rad - 2.3), center_y - width * math.sin(angle_rad - 2.3))
        pygame.draw.polygon(screen, GREEN, [front, left, right])

def draw_flag(x, y, color):
    grid_x = x + GRID_SIZE // 2
    grid_y = y + GRID_SIZE // 2
    pygame.draw.rect(screen, BLACK, (grid_x, grid_y - 10, 3, 20))
    pygame.draw.polygon(screen, color, [(grid_x + 3, grid_y - 10), (grid_x + 13, grid_y - 5), (grid_x + 3, grid_y)])

def draw_button(text, x, y, width, height):
    mouse_x, mouse_y = pygame.mouse.get_pos()
    color = BLUE if pygame.Rect(x, y, width, height).collidepoint(mouse_x, mouse_y) else LIGHT_GRAY
    pygame.draw.rect(screen, color, (x, y, width, height), border_radius=10)
    text_surface = font.render(text, True, BLACK)
    text_rect = text_surface.get_rect(center=(x + width // 2, y + height // 2))
    screen.blit(text_surface, text_rect)
    return pygame.Rect(x, y, width, height)

def random_position():
    positions = [(x * GRID_SIZE, y * GRID_SIZE)
                 for x in range(COLS) for y in range(ROWS)
                 if grid_map[y][x] == 0]
    return random.choice(positions) if positions else (0, 0)

def draw_map():
    for y in range(ROWS):
        for x in range(COLS):
            rect = pygame.Rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE)
            color = WHITE if grid_map[y][x] == 1 else GRAY
            pygame.draw.rect(screen, color, rect)

def main():
    clock = pygame.time.Clock()
    start = random_position()
    destination = random_position()
    courier = Courier(*start)
    path = a_star(start, destination)
    courier.path = path
    last_path = path.copy()
    buttons = {}
    speed_delay = 5  # Default kecepatan
    frame_counter = 0
    running = True

    while running:
        screen.fill(WHITE)
        draw_map()

        button_y = 10
        button_w = 160
        button_h = 50
        buttons["load_map"] = draw_button("Load Peta", 10, button_y, button_w, button_h)
        buttons["random_pos"] = draw_button("Acak Posisi", 180, button_y, button_w, button_h)
        buttons["start"] = draw_button("Mulai", 350, button_y, 100, button_h)
        buttons["replay"] = draw_button("Replay", 460, button_y, 120, button_h)

        draw_flag(start[0], start[1], YELLOW)
        draw_flag(destination[0], destination[1], RED)
        courier.draw()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                if buttons["load_map"].collidepoint(event.pos):
                    load_image_map()
                    start = random_position()
                    destination = random_position()
                    courier = Courier(*start)
                    path = a_star(start, destination)
                    courier.path = path
                    last_path = path.copy()
                    courier.moving = False

                elif buttons["random_pos"].collidepoint(event.pos):
                    start = random_position()
                    destination = random_position()
                    courier = Courier(*start)
                    path = a_star(start, destination)
                    courier.path = path
                    last_path = path.copy()
                    courier.moving = False

                elif buttons["start"].collidepoint(event.pos):
                    courier.moving = True

                elif buttons["replay"].collidepoint(event.pos):
                    if last_path:
                        courier = Courier(*start)
                        courier.path = last_path.copy()
                        courier.moving = True

        if courier.moving:
            frame_counter += 1
            if frame_counter >= speed_delay:
                courier.move()
                frame_counter = 0

        pygame.display.flip()
        clock.tick(30)

    pygame.quit()

if __name__ == "__main__":
    main()
