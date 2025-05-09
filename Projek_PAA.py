import pygame
import random
from tkinter import filedialog
from queue import PriorityQueue

# Inisialisasi Pygame
pygame.init()

# Ukuran layar
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 700
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Smart Courier")

# Warna
WHITE = (255, 255, 255)
GRAY = (128, 128, 128)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)
BLACK = (0, 0, 0)

# Fungsi untuk memuat peta dengan benar
def load_map():
    file_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png;*.jpg;*.jpeg")])
    if file_path:
        return pygame.image.load(file_path)
    return None

# Deteksi warna abu-abu (jalan)
def is_road(color):
    return 90 <= color[0] <= 150 and 90 <= color[1] <= 150 and 90 <= color[2] <= 150

# Algoritma A* untuk mencari jalur terpendek
def a_star(start, goal, map_surface):
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    open_set = PriorityQueue()
    open_set.put((0, start))
    came_from = {}
    g_score = {start: 0}

    while not open_set.empty():
        current = open_set.get()[1]

        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            return path[::-1]

        # Gunakan langkah lebih besar (5 piksel) agar tetap di tengah jalan
        for dx, dy in [(-5, 0), (5, 0), (0, -5), (0, 5)]:
            neighbor = (current[0] + dx, current[1] + dy)
            if 0 <= neighbor[0] < SCREEN_WIDTH and 0 <= neighbor[1] < SCREEN_HEIGHT:
                color = map_surface.get_at(neighbor)[:3]
                if is_road(color):
                    tentative_g_score = g_score[current] + 1
                    if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        f_score = tentative_g_score + heuristic(neighbor, goal)
                        open_set.put((f_score, neighbor))
    return None

# Kelas Kurir
class Courier:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.direction = 'right'
        self.speed = 5
        self.moving = False
        self.path = []

    def move(self):
        if self.path:
            next_pos = self.path[0]
            dx = next_pos[0] - self.x
            dy = next_pos[1] - self.y

            if dx > 0:
                self.direction = 'right'
            elif dx < 0:
                self.direction = 'left'
            elif dy > 0:
                self.direction = 'down'
            elif dy < 0:
                self.direction = 'up'

            self.x = next_pos[0]
            self.y = next_pos[1]
            self.path.pop(0)

    def draw(self):
        if self.direction == 'right':
            pygame.draw.polygon(screen, RED, [(self.x, self.y), (self.x - 10, self.y - 10), (self.x - 10, self.y + 10)])
        elif self.direction == 'left':
            pygame.draw.polygon(screen, RED, [(self.x, self.y), (self.x + 10, self.y - 10), (self.x + 10, self.y + 10)])
        elif self.direction == 'up':
            pygame.draw.polygon(screen, RED, [(self.x, self.y), (self.x - 10, self.y + 10), (self.x + 10, self.y + 10)])
        elif self.direction == 'down':
            pygame.draw.polygon(screen, RED, [(self.x, self.y), (self.x - 10, self.y - 10), (self.x + 10, self.y - 10)])

# Fungsi untuk menggambar tombol
def draw_button(screen, text, x, y, width, height):
    pygame.draw.rect(screen, (200, 200, 200), (x, y, width, height))
    font = pygame.font.SysFont(None, 30)
    text_surface = font.render(text, True, (0, 0, 0))
    screen.blit(text_surface, (x + 10, y + 10))

# Fungsi untuk mengacak posisi kurir dan tujuan
def random_position(map_surface):
    positions = []
    for x in range(0, map_surface.get_width(), 5):  # Langkah lebih besar untuk menghindari tepi
        for y in range(0, map_surface.get_height(), 5):
            color = map_surface.get_at((x, y))[:3]
            if is_road(color):
                positions.append((x + 2, y + 2))  # Pergeseran kecil ke tengah jalan
    return random.choice(positions)

# Main loop
def main():
    clock = pygame.time.Clock()
    map_surface = None
    courier = Courier(100, 100)
    destination = (500, 500)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            # Handle tombol
            if event.type == pygame.MOUSEBUTTONDOWN:
                x, y = pygame.mouse.get_pos()
                if 10 <= x <= 110 and 10 <= y <= 50:  # Tombol Load Peta
                    map_surface = load_map()
                elif 120 <= x <= 240 and 10 <= y <= 50:  # Tombol Acak Posisi
                    if map_surface:
                        courier.x, courier.y = random_position(map_surface)
                        destination = random_position(map_surface)
                        courier.path = a_star((courier.x, courier.y), destination, map_surface)
                elif 250 <= x <= 330 and 10 <= y <= 50:  # Tombol Start
                    courier.moving = True
                elif 340 <= x <= 420 and 10 <= y <= 50:  # Tombol Stop
                    courier.moving = False

        # Gerakan kurir
        if courier.moving and courier.path:
            courier.move()

        # Render layar
        screen.fill(WHITE)
        if map_surface:
            screen.blit(map_surface, (0, 0))
        courier.draw()
        pygame.draw.circle(screen, YELLOW, destination, 10)  # Tujuan
        draw_button(screen, "Load Peta", 10, 10, 100, 40)
        draw_button(screen, "Acak Posisi", 120, 10, 120, 40)
        draw_button(screen, "Start", 250, 10, 80, 40)
        draw_button(screen, "Stop", 340, 10, 80, 40)
        pygame.display.flip()
        clock.tick(30)

    pygame.quit()

if __name__ == "__main__":
    main()