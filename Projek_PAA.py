import pygame
import random
from tkinter import filedialog
from queue import PriorityQueue
import math

# Inisialisasi Pygame
pygame.init()

# Ukuran layar
SCREEN_WIDTH, SCREEN_HEIGHT = 1000, 700
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Smart Courier")

# Warna
WHITE, GRAY, YELLOW, RED, BLACK, BLUE, LIGHT_GRAY = (255, 255, 255), (90, 90, 90), (255, 255, 0), (255, 0, 0), (0, 0, 0), (0, 0, 255), (200, 200, 200)

# Font
pygame.font.init()
font = pygame.font.SysFont("Arial", 24, bold=True)

# Fungsi untuk memuat peta
def load_map():
    file_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png;*.jpg;*.jpeg")])
    return pygame.image.load(file_path) if file_path else None

# Cek apakah warna adalah jalan (abu-abu)
def is_road(color):
    return color[:3] == GRAY

# Cek apakah posisi aman (tidak di tepi jalan atau area lain)
def is_safe_road(x, y, map_surface):
    try:
        if not is_road(map_surface.get_at((x, y))):
            return False
        # Pastikan area sekitar juga jalan, menghindari batas warna lain
        for dx in [-5, 0, 5]:
            for dy in [-5, 0, 5]:
                if not is_road(map_surface.get_at((x + dx, y + dy))):
                    return False
        return True
    except IndexError:
        return False

# Algoritma A* untuk mencari jalur terpendek
def a_star(start, goal, map_surface):
    if not map_surface:
        return []
    
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    open_set = PriorityQueue()
    open_set.put((0, start))
    came_from, g_score = {}, {start: 0}

    while not open_set.empty():
        _, current = open_set.get()
        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            return path[::-1]

        for dx, dy in [(-5, 0), (5, 0), (0, -5), (0, 5)]:
            neighbor = (current[0] + dx, current[1] + dy)
            if 0 <= neighbor[0] < SCREEN_WIDTH and 0 <= neighbor[1] < SCREEN_HEIGHT:
                if is_safe_road(neighbor[0], neighbor[1], map_surface):
                    tentative_g_score = g_score[current] + 1
                    if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        open_set.put((tentative_g_score + heuristic(neighbor, goal), neighbor))
    return []

# Kelas Kurir
class Courier:
    def __init__(self, x, y):
        self.x, self.y = x, y
        self.path, self.moving = [], False
        self.angle = 0

    def move(self):
        if self.path:
            prev_x, prev_y = self.x, self.y
            self.x, self.y = self.path.pop(0)

            dx, dy = self.x - prev_x, self.y - prev_y
            if dx != 0 or dy != 0:
                self.angle = math.degrees(math.atan2(-dy, dx))

    def draw(self):
        length = 10
        angle_rad = math.radians(self.angle)
        
        front = (self.x + length * math.cos(angle_rad), self.y - length * math.sin(angle_rad))
        left = (self.x + length * math.cos(angle_rad + 2.5), self.y - length * math.sin(angle_rad + 2.5))
        right = (self.x + length * math.cos(angle_rad - 2.5), self.y - length * math.sin(angle_rad - 2.5))

        pygame.draw.polygon(screen, RED, [front, left, right])

# Fungsi untuk menggambar tombol
def draw_button(text, x, y, width, height, active=False):
    mouse_x, mouse_y = pygame.mouse.get_pos()
    color = BLUE if pygame.Rect(x, y, width, height).collidepoint(mouse_x, mouse_y) else LIGHT_GRAY
    pygame.draw.rect(screen, color, (x, y, width, height), border_radius=10)
    
    text_surface = font.render(text, True, BLACK)
    text_rect = text_surface.get_rect(center=(x + width // 2, y + height // 2))
    screen.blit(text_surface, text_rect)
    
    return pygame.Rect(x, y, width, height)

# Fungsi untuk mendapatkan posisi acak pada jalan yang aman
def random_position(map_surface):
    if not map_surface:
        return (100, 100)
    
    positions = [(x, y) for x in range(0, SCREEN_WIDTH, 5) for y in range(0, SCREEN_HEIGHT, 5)
                 if is_safe_road(x, y, map_surface)]
    
    return random.choice(positions) if positions else (100, 100)

# Main loop
def main():
    clock = pygame.time.Clock()
    map_surface, courier = None, Courier(100, 100)
    destination = (500, 500)
    buttons = {}
    
    running = True
    while running:
        screen.fill(WHITE)
        if map_surface:
            screen.blit(map_surface, (0, 0))
        
        buttons["load"] = draw_button("Load Peta", 10, 10, 150, 50)
        buttons["random"] = draw_button("Acak Posisi", 170, 10, 160, 50)
        buttons["start"] = draw_button("Mulai", 340, 10, 100, 50, courier.moving)
        buttons["stop"] = draw_button("Berhenti", 450, 10, 120, 50, not courier.moving)
        
        pygame.draw.circle(screen, YELLOW, destination, 10)
        courier.draw()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                if buttons["load"].collidepoint(event.pos):
                    map_surface = load_map()
                elif buttons["random"].collidepoint(event.pos) and map_surface:
                    temp_pos = random_position(map_surface)
                    if temp_pos != (100, 100):
                        courier.x, courier.y = temp_pos
                        destination = random_position(map_surface)
                        if destination != (100, 100):
                            courier.path = a_star((courier.x, courier.y), destination, map_surface)
                        courier.moving = False
                elif buttons["start"].collidepoint(event.pos):
                    courier.moving = True
                elif buttons["stop"].collidepoint(event.pos):
                    courier.moving = False
        
        if courier.moving:
            courier.move()
        
        pygame.display.flip()
        clock.tick(30)
    
    pygame.quit()

if __name__ == "__main__":
    main()
