package io.github.supermonster003.autojs6.plugin.imgui;

import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Lock-free multi-producer input handoff. UI/IME producers never wait for the native frame lock;
 * the renderer drains events in FIFO order immediately before ImGui::NewFrame().
 */
final class ImGuiInputQueue {

    static final int DEFAULT_CAPACITY = 2048;

    interface Sink {
        void touch(int action, float x, float y, int mouseButton);

        void characters(String text);

        void key(int key, boolean down);

        void wheel(float wheelX, float wheelY);

        void mousePos(float x, float y);

        void mouseButton(int button, boolean down);
    }

    private interface InputEvent {
        void dispatch(Sink sink);
    }

    private static final class QueueState {
        final ConcurrentLinkedQueue<InputEvent> events = new ConcurrentLinkedQueue<>();
        final AtomicInteger size = new AtomicInteger();
    }

    private final int capacity;
    private final AtomicReference<QueueState> state = new AtomicReference<>(new QueueState());
    private final AtomicLong droppedEvents = new AtomicLong();

    ImGuiInputQueue() {
        this(DEFAULT_CAPACITY);
    }

    ImGuiInputQueue(int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("Input queue capacity must be positive");
        }
        this.capacity = capacity;
    }

    void offerTouch(int action, float x, float y, int mouseButton) {
        offer(sink -> sink.touch(action, x, y, mouseButton));
    }

    void offerCharacters(String text) {
        String immutableText = text == null ? "" : text;
        offer(sink -> sink.characters(immutableText));
    }

    void offerKey(int key, boolean down) {
        offer(sink -> sink.key(key, down));
    }

    void offerWheel(float wheelX, float wheelY) {
        offer(sink -> sink.wheel(wheelX, wheelY));
    }

    void offerMousePos(float x, float y) {
        offer(sink -> sink.mousePos(x, y));
    }

    void offerMouseButton(int button, boolean down) {
        offer(sink -> sink.mouseButton(button, down));
    }

    int drainTo(Sink sink) {
        if (sink == null) {
            throw new IllegalArgumentException("Input queue sink must not be null");
        }
        QueueState current = state.get();
        int drained = 0;
        InputEvent event;
        while ((event = current.events.poll()) != null) {
            current.size.decrementAndGet();
            event.dispatch(sink);
            drained++;
        }
        return drained;
    }

    void reset() {
        state.set(new QueueState());
        droppedEvents.set(0);
    }

    int pendingCount() {
        return Math.max(0, state.get().size.get());
    }

    long droppedCount() {
        return droppedEvents.get();
    }

    int capacity() {
        return capacity;
    }

    private void offer(InputEvent event) {
        QueueState current = state.get();
        current.size.incrementAndGet();
        current.events.offer(event);
        trimOverflow(current);
    }

    private void trimOverflow(QueueState current) {
        while (current.size.get() > capacity) {
            InputEvent discarded = current.events.poll();
            if (discarded == null) {
                return;
            }
            current.size.decrementAndGet();
            droppedEvents.incrementAndGet();
        }
    }
}
